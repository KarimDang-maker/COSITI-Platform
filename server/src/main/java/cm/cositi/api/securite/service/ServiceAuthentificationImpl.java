package cm.cositi.api.securite.service;

import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.securite.dto.ChangerMotDePasseDto;
import cm.cositi.api.securite.dto.ConnexionReponseDto;
import cm.cositi.api.securite.dto.ConnexionRequeteDto;
import cm.cositi.api.securite.dto.UtilisateurMoiDto;
import cm.cositi.api.securite.entite.Permission;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional
public class ServiceAuthentificationImpl implements ServiceAuthentification {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final ServiceJeton serviceJeton;

    public ServiceAuthentificationImpl(UtilisateurRepository utilisateurRepository,
                                       PasswordEncoder passwordEncoder,
                                       ServiceJeton serviceJeton) {
        this.utilisateurRepository = utilisateurRepository;
        this.passwordEncoder = passwordEncoder;
        this.serviceJeton = serviceJeton;
    }

    @Override
    public ConnexionReponseDto connecter(ConnexionRequeteDto requete) {
        Utilisateur utilisateur = utilisateurRepository.findByIdentifiant(requete.identifiant())
                .orElseThrow(() -> new BadCredentialsException("Identifiant ou mot de passe invalide."));

        if (!utilisateur.isAccountNonLocked()) {
            throw new ExceptionAutorisation("Votre compte est temporairement verrouillé suite à plusieurs tentatives échouées.");
        }

        if (!passwordEncoder.matches(requete.motDePasse(), utilisateur.getMotDePasseHash())) {
            utilisateur.setTentativesEchouees((short) (utilisateur.getTentativesEchouees() + 1));
            if (utilisateur.getTentativesEchouees() >= 5) {
                utilisateur.setVerrouilleJusquA(Instant.now().plusSeconds(900)); // 15 minutes
            }
            utilisateurRepository.save(utilisateur);
            throw new BadCredentialsException("Identifiant ou mot de passe invalide.");
        }

        // Réinitialiser les tentatives en cas de succès
        utilisateur.setTentativesEchouees((short) 0);
        utilisateur.setVerrouilleJusquA(null);
        utilisateur.setDerniereConnexionLe(Instant.now());
        utilisateurRepository.save(utilisateur);

        List<String> roles = utilisateur.getRoles().stream().map(Role::getCode).toList();
        List<String> permissions = utilisateur.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(Permission::getCode)
                .distinct()
                .toList();

        String jetonAcces = serviceJeton.genererJetonAcces(utilisateur, roles);
        String jetonRafraichissement = serviceJeton.genererJetonRafraichissement(utilisateur);

        return new ConnexionReponseDto(
                jetonAcces,
                jetonRafraichissement,
                "Bearer",
                900L,
                utilisateur.isDoitChangerMotDePasse(),
                utilisateur.getIdentifiant(),
                utilisateur.getNomComplet(),
                roles,
                permissions
        );
    }

    @Override
    public ConnexionReponseDto rafraichir(String jetonRafraichissement) {
        String identifiant = serviceJeton.extraireIdentifiant(jetonRafraichissement);
        Utilisateur utilisateur = utilisateurRepository.findByIdentifiant(identifiant)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Utilisateur introuvable pour ce jeton."));

        if (!serviceJeton.estJetonValide(jetonRafraichissement, utilisateur)) {
            throw new ExceptionAutorisation("Jeton de rafraîchissement invalide ou expiré.");
        }

        List<String> roles = utilisateur.getRoles().stream().map(Role::getCode).toList();
        List<String> permissions = utilisateur.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(Permission::getCode)
                .distinct()
                .toList();

        String nouveauJetonAcces = serviceJeton.genererJetonAcces(utilisateur, roles);
        String nouveauJetonRafraichissement = serviceJeton.genererJetonRafraichissement(utilisateur);

        return new ConnexionReponseDto(
                nouveauJetonAcces,
                nouveauJetonRafraichissement,
                "Bearer",
                900L,
                utilisateur.isDoitChangerMotDePasse(),
                utilisateur.getIdentifiant(),
                utilisateur.getNomComplet(),
                roles,
                permissions
        );
    }

    @Override
    @Transactional(readOnly = true)
    public UtilisateurMoiDto getUtilisateurConnecte(Utilisateur utilisateur) {
        List<String> roles = utilisateur.getRoles().stream().map(Role::getCode).toList();
        List<String> permissions = utilisateur.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(Permission::getCode)
                .distinct()
                .toList();

        return new UtilisateurMoiDto(
                utilisateur.getId(),
                utilisateur.getIdentifiant(),
                utilisateur.getEmail(),
                utilisateur.getNomComplet(),
                utilisateur.getTelephone(),
                utilisateur.isMfaActive(),
                utilisateur.isDoitChangerMotDePasse(),
                utilisateur.getAgentId(),
                roles,
                permissions
        );
    }

    @Override
    public void changerMotDePasse(Utilisateur utilisateur, ChangerMotDePasseDto dto) {
        if (!passwordEncoder.matches(dto.ancienMotDePasse(), utilisateur.getMotDePasseHash())) {
            throw new ExceptionConflit("MOT_DE_PASSE_INCORRECT", "L'ancien mot de passe fourni est incorrect.");
        }
        utilisateur.setMotDePasseHash(passwordEncoder.encode(dto.nouveauMotDePasse()));
        utilisateur.setDoitChangerMotDePasse(false);
        utilisateurRepository.save(utilisateur);
    }
}
