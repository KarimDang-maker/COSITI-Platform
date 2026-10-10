package cm.cositi.api.cnps.parcours;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/** Tâches système du parcours CNPS : reconduction des vagues et alertes d'échéance de dépôt. */
@Component
public class PlanificateurParcoursCnps {

    private static final Logger JOURNAL = LoggerFactory.getLogger(PlanificateurParcoursCnps.class);

    private final ServiceParcoursCnps service;

    public PlanificateurParcoursCnps(ServiceParcoursCnps service) {
        this.service = service;
    }

    /** Le 1er de chaque mois : les adhérents encore sous le quota passent à la vague suivante. */
    @Scheduled(cron = "0 30 1 1 * *")
    public void reporterVague() {
        try {
            service.reporterVague(LocalDate.now());
        } catch (Exception e) {
            JOURNAL.error("Échec de la reconduction mensuelle de la préimmatriculation", e);
        }
    }

    /** Chaque matin : alertes J-7, J-3, J-1 (paramétrables) et premier jour de dépassement. */
    @Scheduled(cron = "0 0 7 * * *")
    public void alerterEcheances() {
        try {
            service.alerterEcheancesDepot(LocalDate.now());
        } catch (Exception e) {
            JOURNAL.error("Échec des alertes d'échéance de dépôt du dossier CNPS", e);
        }
    }
}
