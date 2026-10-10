package cm.cositi.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Point d'entrée principal de l'API REST de la plateforme COSITI COOP-CA.
 * Système d'information certifié pour la gestion des adhésions, cotisations et droits CNPS.
 */
@SpringBootApplication
@EnableScheduling
@EnableAsync
@ConfigurationPropertiesScan
public class CositiApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(CositiApiApplication.class, args);
    }
}