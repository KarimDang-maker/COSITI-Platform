package cm.cositi.api.securite.service;

import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.transaction.ExecuteurTransactionIndependante;
import cm.cositi.api.config.JwtProperties;
import cm.cositi.api.securite.entite.JetonRafraichissement;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.JetonRafraichissementRepository;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServiceJetonImpl implements ServiceJeton {

    private static final Logger LOG = LoggerFactory.getLogger(ServiceJetonImpl.class);
    private static final SecureRandom ALEATOIRE = new SecureRandom();

    private final JwtProperties proprietes;
    private final JetonRafraichissementRepository jetonRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final ExecuteurTransactionIndependante transactionIndependante;
    private final SecretKey cle;

    public ServiceJetonImpl(JwtProperties proprietes, JetonRafraichissementRepository jetonRepository,
                             UtilisateurRepository utilisateurRepository,
                             ExecuteurTransactionIndependante transactionIndependante) {
        this.proprietes = proprietes;
        this.jetonRepository = jetonRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.transactionIndependante = transactionIndependante;
        String secret = proprietes.getSecret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "cositi.securite.jwt.secret doit être défini et faire au moins 256 bits (32 octets) — "
                            + "jamais une clé faible en HS256 (docs/04_SECURITE.md §2).");
        }
        this.cle = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public String genererJetonAcces(Utilisateur utilisateur) {
        Instant maintenant = Instant.now();
        Instant expiration = maintenant.plus(proprietes.getExpirationMinutes(), ChronoUnit.MINUTES);
        List<String> codesRoles = utilisateur.getRoles().stream().map(Role::getCode).collect(Collectors.toList());
        return Jwts.builder()
                .subject(utilisateur.getIdentifiant())
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(maintenant))
                .expiration(Date.from(expiration))
                .claim("roles", codesRoles)
                .signWith(cle)
                .compact();
    }

    @Override
    public Optional<String> identifiantDepuisJetonAcces(String jetonAcces) {
        try {
            var claims = Jwts.parser().verifyWith(cle).build().parseSignedClaims(jetonAcces).getPayload();
            return Optional.ofNullable(claims.getSubject());
        } catch (Exception e) {
            LOG.debug("Jeton d'accès invalide ou expiré : {}", e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    @Transactional
    public PaireJetons emettre(Utilisateur utilisateur, String adresseIp, String userAgent) {
        return emettreDansFamille(utilisateur, UUID.randomUUID(), adresseIp, userAgent);
    }

    private PaireJetons emettreDansFamille(Utilisateur utilisateur, UUID familleId, String adresseIp, String userAgent) {
        String jetonBrut = genererJetonOpaque();
        String hash = hacher(jetonBrut);
        Instant expiration = Instant.now().plus(proprietes.getRefreshExpirationDays(), ChronoUnit.DAYS);
        jetonRepository.save(new JetonRafraichissement(utilisateur.getId(), hash, familleId, expiration, adresseIp, userAgent));
        String jetonAcces = genererJetonAcces(utilisateur);
        return new PaireJetons(jetonAcces, jetonBrut, proprietes.getExpirationMinutes() * 60L);
    }

    @Override
    @Transactional
    public PaireJetons rafraichir(String jetonRafraichissementBrut, String adresseIp, String userAgent) {
        String hash = hacher(jetonRafraichissementBrut);
        JetonRafraichissement existant = jetonRepository.findByJetonHash(hash)
                .orElseThrow(() -> new ExceptionAutorisation("JETON_RAFRAICHISSEMENT_INVALIDE",
                        "Jeton de rafraîchissement invalide."));

        if (existant.isRevoque()) {
            // Réutilisation d'un jeton déjà utilisé : vol probable, on révoque toute la famille par sécurité.
            // Écrit dans une transaction indépendante (REQUIRES_NEW) : la révocation doit être commitée
            // même si la méthode se termine ensuite par l'exception ci-dessous (sinon @Transactional
            // annulerait cette révocation avec le reste — voir ExecuteurTransactionIndependante).
            LOG.warn("Réutilisation détectée d'un jeton de rafraîchissement révoqué, famille {} révoquée intégralement.",
                    existant.getFamilleId());
            transactionIndependante.executer(() -> {
                List<JetonRafraichissement> famille = jetonRepository.findByFamilleId(existant.getFamilleId());
                famille.forEach(j -> {
                    if (!j.isRevoque()) {
                        j.revoquer(null);
                    }
                });
                jetonRepository.saveAll(famille);
            });
            throw new ExceptionAutorisation("JETON_RAFRAICHISSEMENT_REUTILISE",
                    "Jeton de rafraîchissement déjà utilisé — toutes les sessions ont été révoquées par sécurité.");
        }

        if (existant.estExpire()) {
            throw new ExceptionAutorisation("JETON_RAFRAICHISSEMENT_EXPIRE", "Jeton de rafraîchissement expiré.");
        }

        Utilisateur utilisateur = utilisateurRepository.findById(existant.getUtilisateurId())
                .orElseThrow(() -> new ExceptionAutorisation("UTILISATEUR_INTROUVABLE", "Compte introuvable."));
        if (!utilisateur.isActif()) {
            throw new ExceptionAutorisation("COMPTE_DESACTIVE", "Ce compte est désactivé.");
        }

        // Rotation : le jeton présenté est révoqué, un nouveau jeton est émis dans la même famille.
        PaireJetons nouvellePaire = emettreDansFamille(utilisateur, existant.getFamilleId(), adresseIp, userAgent);
        String nouveauHash = hacher(nouvellePaire.jetonRafraichissement());
        JetonRafraichissement nouveauJeton = jetonRepository.findByJetonHash(nouveauHash).orElseThrow();
        existant.revoquer(nouveauJeton.getId());
        jetonRepository.save(existant);
        return nouvellePaire;
    }

    @Override
    @Transactional
    public void revoquer(String jetonRafraichissementBrut) {
        jetonRepository.findByJetonHash(hacher(jetonRafraichissementBrut))
                .ifPresent(j -> {
                    if (!j.isRevoque()) {
                        j.revoquer(null);
                        jetonRepository.save(j);
                    }
                });
    }

    @Override
    @Transactional
    public void revoquerTout(UUID utilisateurId) {
        List<JetonRafraichissement> actifs = jetonRepository.findByUtilisateurIdAndRevoqueFalse(utilisateurId);
        actifs.forEach(j -> j.revoquer(null));
        jetonRepository.saveAll(actifs);
    }

    private String genererJetonOpaque() {
        byte[] octets = new byte[64];
        ALEATOIRE.nextBytes(octets);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(octets);
    }

    private String hacher(String valeur) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(valeur.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Algorithme de hachage indisponible.", e);
        }
    }
}
