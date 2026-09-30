package cm.cositi.api.organisation.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Consomme {@link AgentModifieEvent} uniquement après commit — voir {@code EcouteurEvenementsAdherent}. */
@Component
public class EcouteurEvenementsAgent {

    private static final Logger JOURNAL = LoggerFactory.getLogger(EcouteurEvenementsAgent.class);

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void surChangementAgent(AgentModifieEvent evenement) {
        JOURNAL.info("Agent modifié : {} ({})", evenement.agentId(), evenement.typeChangement());
    }
}
