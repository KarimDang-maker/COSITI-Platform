package cm.cositi.api.adhesion.service;

import java.util.List;
import java.util.UUID;

/**
 * Événement du parcours d'adhésion (activation, soumission DGA, décision DGA, anomalie de frais), consommé après
 * commit par {@link EcouteurEvenementsAdhesion} pour les notifications (§18).
 *
 * @param destinataireId utilisateur à notifier personnellement (peut être nul)
 * @param rolesDestinataires rôles à notifier (file DGA, DAF…)
 */
public record AdhesionEvent(
        String type,
        UUID adherentId,
        String entite,
        UUID entiteId,
        UUID destinataireId,
        List<String> rolesDestinataires,
        String titre,
        String corps
) {
}
