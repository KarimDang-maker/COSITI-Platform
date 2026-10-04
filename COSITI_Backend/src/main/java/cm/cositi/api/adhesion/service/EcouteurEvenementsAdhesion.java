package cm.cositi.api.adhesion.service;

import cm.cositi.api.notification.ServiceNotification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Notifications du parcours d'adhésion, envoyées après commit dans une transaction séparée : un échec de
 * notification ne peut ni annuler ni compromettre l'activation ou la décision déjà enregistrée.
 */
@Component
public class EcouteurEvenementsAdhesion {

    private static final Logger JOURNAL = LoggerFactory.getLogger(EcouteurEvenementsAdhesion.class);

    private final ServiceNotification serviceNotification;

    public EcouteurEvenementsAdhesion(ServiceNotification serviceNotification) {
        this.serviceNotification = serviceNotification;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void surEvenement(AdhesionEvent e) {
        JOURNAL.info("Adhésion {} : adhérent {} ({} {})", e.type(), e.adherentId(), e.entite(), e.entiteId());
        try {
            if (e.destinataireId() != null) {
                serviceNotification.notifier(e.destinataireId(), e.type(), e.titre(), e.corps(), e.entite(), e.entiteId());
            }
            if (e.rolesDestinataires() != null && !e.rolesDestinataires().isEmpty()) {
                // Le destinataire nominatif (ex. le Gestionnaire qui a activé) n'est pas prévenu deux fois par son rôle.
                int servis = serviceNotification.notifierRolesSauf(e.rolesDestinataires(), e.destinataireId(), e.type(),
                        e.titre(), e.corps(), e.entite(), e.entiteId());
                if (servis == 0) {
                    JOURNAL.warn("Notification {} sans destinataire actif (rôles {}).", e.type(), e.rolesDestinataires());
                }
            }
        } catch (RuntimeException ex) {
            JOURNAL.error("Notification {} non envoyée pour l'adhérent {}.", e.type(), e.adherentId(), ex);
        }
    }
}
