package cm.cositi.api.securite.bootstrap;

import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.RoleRepository;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Amorçage du premier Super Administrateur — aucun compte par défaut en base (docs/04_SECURITE.md §2).
 * Ne s'exécute que si l'application est démarrée avec l'option {@code --amorcer-super-admin}, accompagnée de
 * {@code --identifiant=}, {@code --mot-de-passe=} et {@code --nom-complet=}. Sans cette option, ce composant
 * ne fait rien : le démarrage normal de l'application n'est jamais affecté.
 *
 * Exemple :
 * {@code java -jar cositi-server.jar --amorcer-super-admin --identifiant=admin.principal
 *   --mot-de-passe="Un-Mot-De-Passe-Suffisamment-Long!" --nom-complet="Super Administrateur COSITI"}
 */
@Component
public class CommandeAmorcageSuperAdmin implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(CommandeAmorcageSuperAdmin.class);
    private static final String OPTION_ACTIVATION = "amorcer-super-admin";
    private static final int LONGUEUR_MIN_MOT_DE_PASSE = 12;

    private final UtilisateurRepository utilisateurRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder encodeurMotDePasse;

    public CommandeAmorcageSuperAdmin(UtilisateurRepository utilisateurRepository, RoleRepository roleRepository,
                                       PasswordEncoder encodeurMotDePasse) {
        this.utilisateurRepository = utilisateurRepository;
        this.roleRepository = roleRepository;
        this.encodeurMotDePasse = encodeurMotDePasse;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!args.containsOption(OPTION_ACTIVATION)) {
            return;
        }

        String identifiant = valeurUnique(args, "identifiant");
        String motDePasse = valeurUnique(args, "mot-de-passe");
        String nomComplet = valeurUnique(args, "nom-complet");

        if (identifiant == null || identifiant.isBlank() || motDePasse == null || nomComplet == null || nomComplet.isBlank()) {
            LOG.error("Amorçage annulé : --identifiant, --mot-de-passe et --nom-complet sont tous obligatoires.");
            return;
        }
        if (motDePasse.length() < LONGUEUR_MIN_MOT_DE_PASSE) {
            LOG.error("Amorçage annulé : le mot de passe doit contenir au moins {} caractères (NIST SP 800-63B).",
                    LONGUEUR_MIN_MOT_DE_PASSE);
            return;
        }
        if (utilisateurRepository.existsByIdentifiant(identifiant)) {
            LOG.error("Amorçage annulé : un utilisateur '{}' existe déjà.", identifiant);
            return;
        }

        Role roleSuperAdmin = roleRepository.findByCode("SUPER_ADMIN")
                .orElseThrow(() -> new IllegalStateException("Rôle SUPER_ADMIN introuvable — migrations Flyway incomplètes."));

        Utilisateur superAdmin = new Utilisateur(identifiant, encodeurMotDePasse.encode(motDePasse), nomComplet);
        superAdmin.setDoitChangerMotDePasse(true);
        superAdmin.ajouterRole(roleSuperAdmin);
        utilisateurRepository.save(superAdmin);

        LOG.info("Super Administrateur '{}' créé avec succès. Un changement de mot de passe sera exigé à la première connexion.",
                identifiant);
    }

    private String valeurUnique(ApplicationArguments args, String nomOption) {
        List<String> valeurs = args.getOptionValues(nomOption);
        if (valeurs == null || valeurs.isEmpty()) {
            return null;
        }
        return valeurs.get(0);
    }
}
