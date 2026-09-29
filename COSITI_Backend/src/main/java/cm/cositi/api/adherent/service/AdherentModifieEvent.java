package cm.cositi.api.adherent.service;

import java.util.UUID;

/**
 * Événement de changement d'adhérent (#35). Publié par {@link ServiceAdherentImpl} et consommé après
 * commit par {@link EcouteurEvenementsAdherent} — fondation pour une future mise à jour temps réel
 * (SSE/WebSocket), non construite ici (voir plan d'implémentation).
 */
public record AdherentModifieEvent(UUID adherentId, String typeChangement) {
}
