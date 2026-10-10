package cm.cositi.api.tempsreel;

import cm.cositi.api.adherent.service.AdherentModifieEvent;
import cm.cositi.api.adhesion.service.AdhesionEvent;
import cm.cositi.api.cotisation.service.PaiementModifieEvent;
import cm.cositi.api.notification.NotificationCreeeEvent;
import cm.cositi.api.organisation.service.AgentModifieEvent;
import cm.cositi.api.workflow.service.DemandeValidationEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Relaie les événements de domaine vers le flux temps réel, <strong>après commit uniquement</strong> : un navigateur
 * n'est jamais invité à recharger une donnée qu'un rollback aurait annulée.
 */
@Component
public class EcouteurTempsReel {

    private final ServiceDiffusionTempsReel diffusion;

    public EcouteurTempsReel(ServiceDiffusionTempsReel diffusion) {
        this.diffusion = diffusion;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void surAdherent(AdherentModifieEvent e) {
        diffusion.diffuser(EvenementTempsReel.de("adherent", e.adherentId(), e.adherentId(), e.typeChangement()));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void surAgent(AgentModifieEvent e) {
        diffusion.diffuser(EvenementTempsReel.de("agent", e.agentId(), null, e.typeChangement()));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void surCotisation(PaiementModifieEvent e) {
        diffusion.diffuser(EvenementTempsReel.de(e.ressource(), e.id(), e.adherentId(), e.typeChangement()));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void surWorkflow(DemandeValidationEvent e) {
        diffusion.diffuser(EvenementTempsReel.de("workflow", e.demandeId(), null,
                e.typeEntite() + ":" + e.action()));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void surAdhesion(AdhesionEvent e) {
        diffusion.diffuser(EvenementTempsReel.de("adhesion", e.entiteId(), e.adherentId(), e.type()));
    }

    /**
     * Notification nominative : poussée à son destinataire, qui la voit apparaître sans recharger. {@code fallbackExecution}
     * couvre une notification déposée hors transaction.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void surNotification(NotificationCreeeEvent e) {
        diffusion.envoyerA(e.destinataireId(), "notification", e.notification());
    }
}
