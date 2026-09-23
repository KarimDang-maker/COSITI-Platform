package cm.cositi.api.securite.bootstrap;

import cm.cositi.api.ConfigurationTestsIntegration;
import cm.cositi.api.organisation.entite.Agent;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Vérifie bout en bout (contexte Spring réel, profil {@code dev}, base Testcontainers) que
 * {@code SeedComptesDemonstrationDev} crée les 8 comptes de démonstration au démarrage, que
 * {@code demo.agent}/{@code demo.chef} possèdent une ligne {@code agent} réelle, et que l'amorçage est
 * idempotent. {@code webEnvironment = NONE} isole volontairement cette classe dans son propre contexte Spring
 * (donc son propre passage de {@code ApplicationRunner}) plutôt que de dépendre de l'ordre d'exécution des
 * autres suites d'intégration qui partagent un contexte {@code RANDOM_PORT} mis en cache.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("dev")
class SeedComptesDemonstrationDevIntegrationTest extends ConfigurationTestsIntegration {

    @Autowired
    private UtilisateurRepository utilisateurRepository;
    @Autowired
    private AgentRepository agentRepository;
    @Autowired
    private SeedComptesDemonstrationDev seed;

    private static final String[] IDENTIFIANTS = {
            "demo.pca", "demo.dg", "demo.dga", "demo.daf", "demo.gestionnaire", "demo.chef", "demo.agent", "demo.superadmin"
    };

    @Test
    void creeLesHuitComptesDeDemonstrationAvecMotDePasseFixeEtDoitChangerMotDePasseFaux() {
        for (String identifiant : IDENTIFIANTS) {
            Utilisateur u = utilisateurRepository.findByIdentifiant(identifiant)
                    .orElseThrow(() -> new AssertionError("Compte de démonstration manquant : " + identifiant));
            assertThat(u.isDoitChangerMotDePasse()).isFalse();
            assertThat(u.isActif()).isTrue();
        }
    }

    @Test
    void demoAgentEtDemoChefPossedentUneLigneAgentReelleRattacheeEtLeChefSupervise() {
        Utilisateur compteAgent = utilisateurRepository.findByIdentifiant("demo.agent").orElseThrow();
        Utilisateur compteChef = utilisateurRepository.findByIdentifiant("demo.chef").orElseThrow();

        assertThat(compteAgent.getAgentId()).isNotNull();
        assertThat(compteChef.getAgentId()).isNotNull();
        assertThat(compteChef.possedeRole("CHEF_AGENT_TERRAIN")).isTrue();
        assertThat(compteChef.possedeRole("AGENT_TERRAIN")).isTrue();

        Agent agentDemo = agentRepository.findById(compteAgent.getAgentId()).orElseThrow();
        Agent agentChef = agentRepository.findById(compteChef.getAgentId()).orElseThrow();
        assertThat(agentDemo.getZoneId()).isNotNull();
        assertThat(agentDemo.getChefAgentId()).isEqualTo(agentChef.getId());
    }

    @Test
    void unSecondAmorcageEstIdempotentEtNeDupliqueAucunCompte() {
        long avant = utilisateurRepository.count();

        seed.run(new DefaultApplicationArguments());

        long apres = utilisateurRepository.count();
        assertThat(apres).isEqualTo(avant);
        for (String identifiant : IDENTIFIANTS) {
            long occurrences = 0;
            Optional<Utilisateur> u = utilisateurRepository.findByIdentifiant(identifiant);
            occurrences = u.isPresent() ? 1 : 0;
            assertThat(occurrences).isEqualTo(1);
        }
    }
}
