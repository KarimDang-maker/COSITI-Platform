package cm.cositi.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("dev")
class CositiApiApplicationTests extends ConfigurationTestsIntegration {

    @Test
    void contextLoads() {
        // Vérification du chargement sans régression du contexte Spring Boot 3.3 + validation du schéma Flyway réel.
    }
}
