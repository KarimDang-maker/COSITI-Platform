package cm.cositi.api.cotisation.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Consomme {@link PaiementModifieEvent} uniquement après commit (#36) : un rollback n'émet jamais d'événement
 * pour une opération qui n'a pas eu lieu. Voir {@code EcouteurEvenementsAdherent}.
 */
@Component
public class EcouteurEvenementsCotisation {

    private static final Logger JOURNAL = LoggerFactory.getLogger(EcouteurEvenementsCotisation.class);

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void surChangement(PaiementModifieEvent evenement) {
        JOURNAL.info("Cotisation modifiée : {} {} ({} -> {})", evenement.ressource(), evenement.id(),
                evenement.typeChangement(), evenement.statut());
    }
}
