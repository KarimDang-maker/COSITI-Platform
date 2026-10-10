package cm.cositi.api.avantage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/** Réévalue chaque nuit les avantages de tous les adhérents (après le rafraîchissement des statuts de régularité). */
@Component
public class PlanificateurAvantage {

    private static final Logger JOURNAL = LoggerFactory.getLogger(PlanificateurAvantage.class);

    private final ServiceAvantage service;

    public PlanificateurAvantage(ServiceAvantage service) {
        this.service = service;
    }

    @Scheduled(cron = "0 15 2 * * *")
    public void evaluerTous() {
        try {
            service.recalculerTous(LocalDate.now());
        } catch (Exception e) {
            JOURNAL.error("Échec de l'évaluation nocturne des avantages", e);
        }
    }
}
