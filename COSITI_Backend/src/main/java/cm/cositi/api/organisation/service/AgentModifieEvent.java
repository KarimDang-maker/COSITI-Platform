package cm.cositi.api.organisation.service;

import java.util.UUID;

/**
 * Événement de changement d'agent (#25). Publié par {@link ServiceAgentImpl}/{@link ServicePortefeuilleImpl}
 * et consommé après commit par {@link EcouteurEvenementsAgent} — même fondation que
 * {@code cm.cositi.api.adherent.service.AdherentModifieEvent}, point d'extension pour une future mise à
 * jour temps réel (SSE/WebSocket), non construite ici.
 */
public record AgentModifieEvent(UUID agentId, String typeChangement) {
}
