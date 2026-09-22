package cm.cositi.api;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Socle des tests d'intégration : une vraie base PostgreSQL 16 éphémère (Testcontainers), migrée par Flyway,
 * conformément à AGENTS.md (jamais H2, {@code ddl-auto=validate} exige le dialecte réel).
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

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("cositi_db_test")
            .withUsername("cositi_app")
            .withPassword("test_password_1234");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void proprietesDynamiques(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
