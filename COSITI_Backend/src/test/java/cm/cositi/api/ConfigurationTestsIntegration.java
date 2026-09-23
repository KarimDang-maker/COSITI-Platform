package cm.cositi.api;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Socle des tests d'intégration : une vraie base PostgreSQL 16, migrée par Flyway, conformément à AGENTS.md
 * (jamais H2, {@code ddl-auto=validate} exige le dialecte réel).
 *
 * <p><b>Deux modes d'exécution</b>, au choix, sans changement de code de test :</p>
 * <ol>
 *   <li><b>Testcontainers</b> (défaut, mode de la CI) : une base éphémère est démarrée dans un conteneur
 *       Docker.</li>
 *   <li><b>Base externe</b> (poste de développement sans Docker) : si la propriété système
 *       {@code cositi.test.db.url} — ou la variable d'environnement {@code COSITI_TEST_DB_URL} — est
 *       renseignée, cette base est utilisée telle quelle et <b>aucun conteneur n'est démarré</b>. Voir
 *       {@code outils/dev/tests-backend.ps1}, qui recrée une base de test vierge puis lance la suite.</li>
 * </ol>
 *
 * <p>Le mode « base externe » exige une base <b>dédiée aux tests et vide</b> à chaque exécution : les tests
 * d'intégration partagent la base au sein d'une même JVM et ne nettoient pas derrière eux (index uniques
 * partiels, séquences de matricule). Pointer ce mode sur la base de développement ferait échouer la suite
 * et polluerait les données locales.</p>
 *
 * <p><b>Motif du conteneur "singleton manuel"</b> (pas d'annotation {@code @Container}/{@code @Testcontainers}) :
 * quand plusieurs classes de test étendent cette base, l'extension JUnit 5 de Testcontainers gère le cycle de
 * vie d'un champ {@code static @Container} par CLASSE (démarré en {@code @BeforeAll}, arrêté en
 * {@code @AfterAll}) même si le champ est hérité et donc physiquement partagé — la première classe de la suite
 * arrête le conteneur pour toutes les autres, qui échouent alors avec "Connection refused". On démarre donc le
 * conteneur une seule fois dans un bloc statique, jamais arrêté explicitement : Ryuk (le "reaper" embarqué de
 * Testcontainers) le nettoie à la fin de la JVM de test.</p>
 */
public abstract class ConfigurationTestsIntegration {

    private static final String URL_EXTERNE = valeurConfiguree("cositi.test.db.url", "COSITI_TEST_DB_URL");
    private static final String UTILISATEUR_EXTERNE =
            valeurConfiguree("cositi.test.db.username", "COSITI_TEST_DB_USERNAME");
    private static final String MOT_DE_PASSE_EXTERNE =
            valeurConfiguree("cositi.test.db.password", "COSITI_TEST_DB_PASSWORD");

    /** {@code null} en mode « base externe » : le conteneur n'est alors jamais instancié ni démarré. */
    static final PostgreSQLContainer<?> POSTGRES = URL_EXTERNE != null ? null
            : new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("cositi_db_test")
                    .withUsername("cositi_app")
                    .withPassword("test_password_1234");

    static {
        if (POSTGRES != null) {
            POSTGRES.start();
        }
    }

    @DynamicPropertySource
    static void proprietesDynamiques(DynamicPropertyRegistry registry) {
        // La limitation de débit (jalon J11) est désactivée pour la suite d'intégration : elle enchaîne
        // des dizaines de connexions depuis la même adresse en quelques secondes et atteindrait la limite
        // de 20 par tranche de 15 minutes, pour une raison sans rapport avec ce que les tests vérifient.
        // Le comportement du filtre lui-même est couvert par `FiltreLimiteDebitTest`, en isolation.
        registry.add("cositi.securite.debit.actif", () -> "false");

        if (POSTGRES != null) {
            registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
            registry.add("spring.datasource.username", POSTGRES::getUsername);
            registry.add("spring.datasource.password", POSTGRES::getPassword);
        } else {
            registry.add("spring.datasource.url", () -> URL_EXTERNE);
            registry.add("spring.datasource.username", () -> UTILISATEUR_EXTERNE);
            registry.add("spring.datasource.password", () -> MOT_DE_PASSE_EXTERNE);
        }
    }

    private static String valeurConfiguree(String proprieteSysteme, String variableEnvironnement) {
        String valeur = System.getProperty(proprieteSysteme);
        if (valeur == null || valeur.isBlank()) {
            valeur = System.getenv(variableEnvironnement);
        }
        return valeur == null || valeur.isBlank() ? null : valeur;
    }
}
