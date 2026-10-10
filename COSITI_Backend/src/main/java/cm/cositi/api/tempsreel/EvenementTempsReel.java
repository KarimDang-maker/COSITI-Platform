package cm.cositi.api.tempsreel;

import java.time.Instant;
import java.util.UUID;

/**
 * Signal de changement diffusé aux navigateurs connectés (flux {@code GET /api/v1/temps-reel/flux}).
 *
 * <p>Il ne porte <strong>aucune donnée métier ni personnelle</strong> : seulement la nature de la ressource modifiée
 * et ses identifiants techniques. Le navigateur qui le reçoit recharge la ressource par l'API ordinaire, qui applique
 * permissions et périmètre de données : le flux ne peut donc jamais divulguer ce que l'API refuserait.
 *
 * @param domaine        {@code adherent}, {@code agent}, {@code paiement}, {@code bilan_caisse}, {@code workflow},
 *                       {@code adhesion}
 * @param id             identifiant de la ressource modifiée (peut être nul)
 * @param adherentId     adhérent concerné, s'il y en a un (peut être nul)
 * @param typeChangement nature du changement, telle que publiée par le service d'origine
 * @param horodatage     instant de diffusion
 */
public record EvenementTempsReel(String domaine, UUID id, UUID adherentId, String typeChangement, Instant horodatage) {

    public static EvenementTempsReel de(String domaine, UUID id, UUID adherentId, String typeChangement) {
        return new EvenementTempsReel(domaine, id, adherentId, typeChangement, Instant.now());
    }
}
