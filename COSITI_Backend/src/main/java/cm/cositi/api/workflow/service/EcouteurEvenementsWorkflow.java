package cm.cositi.api.workflow.service;

import cm.cositi.api.notification.ServiceNotification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Notifications du workflow (§22), envoyées après commit (§23) dans une transaction séparée : une notification
 * qui échoue ne peut ni annuler ni compromettre la décision déjà enregistrée.
 */
@Component
public class EcouteurEvenementsWorkflow {

    private static final Logger JOURNAL = LoggerFactory.getLogger(EcouteurEvenementsWorkflow.class);

    private final ServiceNotification serviceNotification;

    public EcouteurEvenementsWorkflow(ServiceNotification serviceNotification) {
        this.serviceNotification = serviceNotification;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void surEvenement(DemandeValidationEvent e) {
        JOURNAL.info("Demande {} ({} {} {}) : {} -> {}", e.reference(), e.typeOperation(), e.typeEntite(),
                e.entiteId(), e.action(), e.statut());
        try {
            switch (e.action()) {
                case SOUMISSION, RESOUMISSION -> {
                    int servis = serviceNotification.notifierRoles(e.rolesValidateurs(), "DEMANDE_VALIDATION_A_TRAITER",
                            "Demande " + e.reference() + " à valider",
                            libelle(e) + " attend votre décision.", "demande_validation", e.demandeId());
                    if (servis == 0) {
                        JOURNAL.warn("Demande {} soumise sans aucun validateur habilité actif (rôles {}).",
                                e.reference(), e.rolesValidateurs());
                    }
                }
                case APPROBATION -> serviceNotification.notifier(e.demandeurId(), "DEMANDE_VALIDATION_APPROUVEE",
                        "Demande " + e.reference() + " approuvée",
                        libelle(e) + " a été approuvée et appliquée.", "demande_validation", e.demandeId());
                case REJET -> serviceNotification.notifier(e.demandeurId(), "DEMANDE_VALIDATION_REJETEE",
                        "Demande " + e.reference() + " rejetée",
                        libelle(e) + " a été rejetée : " + e.commentaire(), "demande_validation", e.demandeId());
                case DEMANDE_CORRECTION -> serviceNotification.notifier(e.demandeurId(),
                        "DEMANDE_VALIDATION_CORRECTION", "Correction demandée sur " + e.reference(),
                        libelle(e) + " doit être complétée : " + e.commentaire(), "demande_validation", e.demandeId());
                default -> { }
            }
        } catch (RuntimeException ex) {
            JOURNAL.error("Notification non envoyée pour la demande {} ({}).", e.reference(), e.action(), ex);
        }
    }

    private static String libelle(DemandeValidationEvent e) {
        return switch (e.typeOperation()) {
            case ADHERENT_VALIDATION_DOSSIER -> "La validation du dossier adhérent";
            case ADHERENT_MODIFICATION -> "La modification du dossier adhérent";
            case AGENT_VALIDATION_PROFIL -> "La validation du profil d'agent";
            case AGENT_MODIFICATION -> "La modification du profil d'agent";
            case AGENT_CHANGEMENT_STATUT -> "Le changement de statut de l'agent";
            case PAIEMENT_CORRECTION -> "La correction de cotisation";
        } + " (" + e.reference() + ")";
    }
}
