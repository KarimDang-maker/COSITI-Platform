package cm.cositi.api.adherent.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Consomme {@link AdherentModifieEvent} uniquement après commit (jamais avant, pour ne jamais notifier un
 * changement qui serait ensuite annulé par un rollback). V1 : journalisation seule — point d'extension pour
 * un futur canal temps réel (SSE/WebSocket) si le besoin est confirmé.
 */
@Component
public class EcouteurEvenementsAdherent {

    private static final Logger JOURNAL = LoggerFactory.getLogger(EcouteurEvenementsAdherent.class);

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void surChangementAdherent(AdherentModifieEvent evenement) {
        JOURNAL.info("Adhérent modifié : {} ({})", evenement.adherentId(), evenement.typeChangement());
    }
}
