package cm.cositi.api.securite.bootstrap;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.organisation.entite.Agent;
import cm.cositi.api.organisation.entite.Zone;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.organisation.repository.ZoneRepository;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.RoleRepository;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Dérogation explicite et volontaire à la règle absolue « Aucun compte de test, aucun compte par défaut en
 * base » de {@code AGENTS.md} — documentée aussi dans {@code docs/04_SECURITE.md §2}. L'utilisateur du
 * prototype a explicitement demandé de pouvoir se connecter à chacun des 8 rôles pour démonstration. L'esprit
 * de la règle absolue (« aucun compte de démonstration n'existe jamais en production ») est conservé par un
 * double verrou :
 * <ol>
 *   <li>{@code @Profile({"dev","local"})} — Spring ne charge même pas ce bean hors de ces deux profils ;</li>
 *   <li>une vérification explicite en code, ci-dessous, que le profil actif ne contient jamais {@code prod}
 *   avant d'écrire quoi que ce soit — au cas où un déploiement combinerait malencontreusement les profils
 *   {@code dev}/{@code local} et {@code prod}.</li>
 * </ol>
 *
 * <p>Idempotent (vérifie l'existence de chaque identifiant avant création), audité comme n'importe quelle
 * création de compte ({@code UTILISATEUR_CREATION}, auteur {@code SYSTEME} — aucune authentification n'existe
 * encore au démarrage, {@code ServiceAuditImpl}/{@code JpaConfig.auditorAware} retombent déjà sur
 * {@code "SYSTEME"} en l'absence de {@code SecurityContext}, comportement identique à
 * {@code CommandeAmorcageSuperAdmin}).</p>
 */
@Component
@Profile({"dev", "local"})
public class SeedComptesDemonstrationDev implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(SeedComptesDemonstrationDev.class);

    /**
     * Mot de passe fixe de démonstration (16 caractères, ≥ 12 exigé par la politique NIST SP 800-63B déjà en
     * place — voir {@code CommandeAmorcageSuperAdmin}). Documenté en clair dans {@code CONNEXION.md}, fichier
     * local non versionné, au même titre que le secret JWT de développement.
     */
    private static final String MOT_DE_PASSE_DEMO = "Cositi#Demo2026!";
    private static final String CODE_ZONE_DEMO = "ZONE-DEMO";

    /** Ordre d'insertion volontairement stable (table LinkedHashMap) pour un journal d'audit lisible. */
    private static final Map<String, String> IDENTIFIANTS_PAR_ROLE = new LinkedHashMap<>();

    static {
        IDENTIFIANTS_PAR_ROLE.put("PCA", "demo.pca");
        IDENTIFIANTS_PAR_ROLE.put("DG", "demo.dg");
        IDENTIFIANTS_PAR_ROLE.put("DGA", "demo.dga");
        IDENTIFIANTS_PAR_ROLE.put("DAF", "demo.daf");
        IDENTIFIANTS_PAR_ROLE.put("GESTIONNAIRE_COMPTE", "demo.gestionnaire");
        IDENTIFIANTS_PAR_ROLE.put("CHEF_AGENT_TERRAIN", "demo.chef");
        IDENTIFIANTS_PAR_ROLE.put("AGENT_TERRAIN", "demo.agent");
        IDENTIFIANTS_PAR_ROLE.put("SUPER_ADMIN", "demo.superadmin");
    }

    private final Environment environment;
    private final UtilisateurRepository utilisateurRepository;
    private final RoleRepository roleRepository;
    private final AgentRepository agentRepository;
    private final ZoneRepository zoneRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder encodeurMotDePasse;
    private final ServiceAudit serviceAudit;

    public SeedComptesDemonstrationDev(Environment environment, UtilisateurRepository utilisateurRepository,
                                        RoleRepository roleRepository, AgentRepository agentRepository,
                                        ZoneRepository zoneRepository, JdbcTemplate jdbcTemplate,
                                        PasswordEncoder encodeurMotDePasse, ServiceAudit serviceAudit) {
        this.environment = environment;
        this.utilisateurRepository = utilisateurRepository;
        this.roleRepository = roleRepository;
        this.agentRepository = agentRepository;
        this.zoneRepository = zoneRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.encodeurMotDePasse = encodeurMotDePasse;
        this.serviceAudit = serviceAudit;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Second verrou explicite (le premier est l'annotation @Profile ci-dessus) : refuse catégoriquement
        // d'écrire quoi que ce soit si "prod" figure parmi les profils actifs, quelle que soit la combinaison.
        for (String profil : environment.getActiveProfiles()) {
            if ("prod".equalsIgnoreCase(profil)) {
                LOG.error("SeedComptesDemonstrationDev : profil 'prod' détecté parmi les profils actifs ({}) — "
                        + "aucun compte de démonstration ne sera créé.", (Object) environment.getActiveProfiles());
                return;
            }
        }

        UUID zoneId = obtenirOuCreerZoneDemo();

        for (Map.Entry<String, String> entree : IDENTIFIANTS_PAR_ROLE.entrySet()) {
            String codeRole = entree.getKey();
            String identifiant = entree.getValue();
            if (utilisateurRepository.existsByIdentifiant(identifiant)) {
                continue;
            }
            creerCompteDemo(identifiant, codeRole, zoneId);
        }
    }

    private void creerCompteDemo(String identifiant, String codeRole, UUID zoneId) {
        Role role = roleRepository.findByCode(codeRole)
                .orElseThrow(() -> new IllegalStateException(
                        "Rôle " + codeRole + " introuvable — migrations Flyway incomplètes."));

        Utilisateur compte = new Utilisateur(identifiant, encodeurMotDePasse.encode(MOT_DE_PASSE_DEMO),
                "Démonstration " + role.getLibelle());
        // Confort de démo assumé : pas un compte réel, cf. Javadoc de la classe.
        compte.setDoitChangerMotDePasse(false);
        compte.ajouterRole(role);

        boolean besoinAgent = "AGENT_TERRAIN".equals(codeRole) || "CHEF_AGENT_TERRAIN".equals(codeRole);
        if (besoinAgent && "CHEF_AGENT_TERRAIN".equals(codeRole)) {
            // Le Chef porte aussi le rôle AGENT_TERRAIN (superposition documentée dans
            // V5__catalogue_permissions.sql : « un utilisateur désigné Chef porte les deux rôles »).
            roleRepository.findByCode("AGENT_TERRAIN").ifPresent(compte::ajouterRole);
        }
        compte = utilisateurRepository.save(compte);

        if (besoinAgent) {
            Long valeurSequence = jdbcTemplate.queryForObject("SELECT nextval('seq_code_agent')", Long.class);
            String codeAgent = "AG-DEMO-" + String.format("%03d", valeurSequence);
            Agent agentCree = new Agent(codeAgent, compte.getNomComplet(), "690000000", zoneId);
            agentCree.setUtilisateurId(compte.getId());
            agentCree = agentRepository.save(agentCree);
            UUID agentId = agentCree.getId();

            compte.setAgentId(agentId);
            compte = utilisateurRepository.save(compte);

            if ("AGENT_TERRAIN".equals(codeRole)) {
                // Rattache l'agent de démonstration au Chef de démonstration s'il a déjà été créé dans ce même
                // passage (ordre d'insertion stable ci-dessus : le Chef est créé avant l'Agent).
                utilisateurRepository.findByIdentifiant(IDENTIFIANTS_PAR_ROLE.get("CHEF_AGENT_TERRAIN"))
                        .map(Utilisateur::getAgentId)
                        .flatMap(agentRepository::findById)
                        .ifPresent(chefAgent -> {
                            Agent a = agentRepository.findById(agentId).orElseThrow();
                            a.setChefAgentId(chefAgent.getId());
                            agentRepository.save(a);
                        });
            }
        }

        serviceAudit.tracer(TypeOperation.UTILISATEUR_CREATION, "utilisateur", compte.getId(), null,
                Map.of("identifiant", identifiant, "role", codeRole),
                "Compte de démonstration (profil dev/local) — jamais activé en profil prod, voir "
                        + "SeedComptesDemonstrationDev et docs/04_SECURITE.md §2.");

        LOG.info("Compte de démonstration '{}' ({}) créé.", identifiant, codeRole);
    }

    private UUID obtenirOuCreerZoneDemo() {
        List<UUID> zonesExistantes = jdbcTemplate.queryForList("SELECT id FROM zone LIMIT 1", UUID.class);
        if (!zonesExistantes.isEmpty()) {
            return zonesExistantes.get(0);
        }
        return zoneRepository.findByCode(CODE_ZONE_DEMO).map(Zone::getId).orElseGet(() -> {
            Zone zone = new Zone(CODE_ZONE_DEMO, "Zone de démonstration", "Douala", "Littoral");
            return zoneRepository.save(zone).getId();
        });
    }
}
