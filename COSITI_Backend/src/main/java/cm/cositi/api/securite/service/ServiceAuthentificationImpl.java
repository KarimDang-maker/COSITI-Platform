package cm.cositi.api.securite.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.transaction.ExecuteurTransactionIndependante;
import cm.cositi.api.securite.dto.ChangerMotDePasseDto;
import cm.cositi.api.securite.dto.JetonReponseDto;
import cm.cositi.api.securite.dto.ProfilDto;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ServiceAuthentificationImpl implements ServiceAuthentification {

    private static final int SEUIL_VERROUILLAGE = 5;
    private static final int DUREE_BASE_MINUTES = 15;

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder encodeurMotDePasse;
    private final ServiceJeton serviceJeton;
    private final ServiceAudit serviceAudit;
    private final ExecuteurTransactionIndependante transactionIndependante;

    public ServiceAuthentificationImpl(UtilisateurRepository utilisateurRepository, PasswordEncoder encodeurMotDePasse,
                                        ServiceJeton serviceJeton, ServiceAudit serviceAudit,
                                        ExecuteurTransactionIndependante transactionIndependante) {
        this.utilisateurRepository = utilisateurRepository;
        this.encodeurMotDePasse = encodeurMotDePasse;
        this.serviceJeton = serviceJeton;
        this.serviceAudit = serviceAudit;
        this.transactionIndependante = transactionIndependante;
    }

    @Override
    @Transactional
    public JetonReponseDto connecter(String identifiant, String motDePasse, String adresseIp, String userAgent) {
        Utilisateur utilisateur = utilisateurRepository.findByIdentifiant(identifiant).orElse(null);

        if (utilisateur == null) {
            // Écriture d'audit indépendante : doit survivre même si la suite lève une exception
            // (pas de transaction anglobante ici de toute façon, mais on reste homogène avec les autres branches).
            transactionIndependante.executer(() -> serviceAudit.tracer(TypeOperation.CONNEXION_ECHEC, "utilisateur",
                    null, null, null, "Identifiant inconnu : " + identifiant));
            throw identifiantsInvalides();
        }

        if (utilisateur.estVerrouille()) {
            transactionIndependante.executer(() -> serviceAudit.tracer(TypeOperation.CONNEXION_ECHEC, "utilisateur",
                    utilisateur.getId(), null, null,
                    "Tentative sur compte verrouillé jusqu'à "
                            + DateTimeFormatter.ISO_INSTANT.format(utilisateur.getVerrouilleJusquA())));
            throw new ExceptionMetier("COMPTE_VERROUILLE",
                    "Ce compte est temporairement verrouillé suite à plusieurs échecs de connexion. Réessayez plus tard.",
                    HttpStatus.UNAUTHORIZED);
        }

        if (!utilisateur.isActif() || !encodeurMotDePasse.matches(motDePasse, utilisateur.getMotDePasseHash())) {
            // Transaction indépendante : le compteur d'échecs et le verrouillage éventuel doivent être
            // persistés même si cette méthode se termine par IDENTIFIANTS_INVALIDES juste après
            // (voir ExecuteurTransactionIndependante — sans cela, un simple @Transactional annulerait
            // silencieusement le compteur à chaque tentative, et le compte ne se verrouillerait jamais).
            transactionIndependante.executer(() -> {
                enregistrerEchec(utilisateur);
                serviceAudit.tracer(TypeOperation.CONNEXION_ECHEC, "utilisateur", utilisateur.getId(), null, null,
                        "Mot de passe invalide ou compte désactivé.");
            });
            throw identifiantsInvalides();
        }

        utilisateur.setTentativesEchouees((short) 0);
        utilisateur.setVerrouilleJusquA(null);
        utilisateur.setDerniereConnexionLe(Instant.now());
        utilisateurRepository.save(utilisateur);

        PaireJetons paire = serviceJeton.emettre(utilisateur, adresseIp, userAgent);
        serviceAudit.tracer(TypeOperation.CONNEXION_SUCCES, "utilisateur", utilisateur.getId(), null, null, null);

        return new JetonReponseDto(paire.jetonAcces(), paire.jetonRafraichissement(),
                paire.expirationAccesSecondes(), utilisateur.isDoitChangerMotDePasse());
    }

    private void enregistrerEchec(Utilisateur utilisateur) {
        int tentatives = utilisateur.getTentativesEchouees() + 1;
        utilisateur.setTentativesEchouees((short) tentatives);
        if (tentatives % SEUIL_VERROUILLAGE == 0) {
            int nbVerrouillages = tentatives / SEUIL_VERROUILLAGE;
            long dureeMinutes = (long) DUREE_BASE_MINUTES * (1L << Math.min(nbVerrouillages - 1, 6));
            utilisateur.setVerrouilleJusquA(Instant.now().plus(dureeMinutes, ChronoUnit.MINUTES));
            serviceAudit.tracer(TypeOperation.COMPTE_VERROUILLE, "utilisateur", utilisateur.getId(), null, null,
                    "Verrouillage après " + tentatives + " échecs, durée " + dureeMinutes + " minutes.");
        }
        utilisateurRepository.save(utilisateur);
    }

    private ExceptionMetier identifiantsInvalides() {
        return new ExceptionMetier("IDENTIFIANTS_INVALIDES", "Identifiant ou mot de passe invalide.",
                HttpStatus.UNAUTHORIZED);
    }

    @Override
    @Transactional
    public JetonReponseDto rafraichir(String jetonRafraichissement, String adresseIp, String userAgent) {
        PaireJetons paire = serviceJeton.rafraichir(jetonRafraichissement, adresseIp, userAgent);
        serviceAudit.tracer(TypeOperation.RAFRAICHISSEMENT_JETON, "jeton_rafraichissement", null, null, null, null);
        return new JetonReponseDto(paire.jetonAcces(), paire.jetonRafraichissement(), paire.expirationAccesSecondes(), false);
    }

    @Override
    @Transactional
    public void deconnecter(String jetonRafraichissement, Utilisateur utilisateurCourant) {
        serviceJeton.revoquer(jetonRafraichissement);
        serviceAudit.tracer(TypeOperation.DECONNEXION, "utilisateur", utilisateurCourant.getId(), null, null, null);
    }

    @Override
    @Transactional
    public void changerMotDePasse(Utilisateur utilisateurCourant, ChangerMotDePasseDto dto) {
        if (!encodeurMotDePasse.matches(dto.ancienMotDePasse(), utilisateurCourant.getMotDePasseHash())) {
            throw new ExceptionMetier("MOT_DE_PASSE_ACTUEL_INVALIDE", "Le mot de passe actuel est incorrect.",
                    HttpStatus.BAD_REQUEST, "ancienMotDePasse");
        }
        if (dto.ancienMotDePasse().equals(dto.nouveauMotDePasse())) {
            throw new ExceptionMetier("MOT_DE_PASSE_IDENTIQUE",
                    "Le nouveau mot de passe doit être différent de l'ancien.", HttpStatus.BAD_REQUEST, "nouveauMotDePasse");
        }
        utilisateurCourant.setMotDePasseHash(encodeurMotDePasse.encode(dto.nouveauMotDePasse()));
        utilisateurCourant.setDoitChangerMotDePasse(false);
        utilisateurRepository.save(utilisateurCourant);
        // Changement de mot de passe = révocation de toutes les sessions actives, par sécurité.
        serviceJeton.revoquerTout(utilisateurCourant.getId());
        serviceAudit.tracer(TypeOperation.MOT_DE_PASSE_CHANGEMENT, "utilisateur", utilisateurCourant.getId(),
                null, null, null);
    }

    @Override
    public ProfilDto profil(Utilisateur utilisateurCourant) {
        List<String> roles = utilisateurCourant.getRoles().stream().map(Role::getCode).collect(Collectors.toList());
        List<String> permissions = utilisateurCourant.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(p -> p.getCode())
                .distinct()
                .collect(Collectors.toList());
        return new ProfilDto(utilisateurCourant.getId(), utilisateurCourant.getIdentifiant(),
                utilisateurCourant.getNomComplet(), roles, permissions);
    }
}
