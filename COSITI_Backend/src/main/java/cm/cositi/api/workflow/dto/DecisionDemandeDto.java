package cm.cositi.api.workflow.dto;

import jakarta.validation.constraints.Size;

/**
 * Décision ou transition (§15 {@code ValidationDecisionCommand}). Le commentaire est obligatoire pour un rejet et
 * une demande de correction (contrôlé par le service). {@code cleIdempotence} peut aussi venir de l'en-tête
 * {@code Idempotency-Key}.
 *
 * @param ignorerDoublons approbation d'un dossier adhérent malgré des doublons potentiels détectés au recontrôle —
 *                        décision explicite, tracée dans l'audit.
 */
public record DecisionDemandeDto(
        @Size(max = 1000, message = "Le commentaire ne peut pas dépasser 1000 caractères.") String commentaire,
        @Size(max = 80, message = "La clé d'idempotence ne peut pas dépasser 80 caractères.") String cleIdempotence,
        boolean ignorerDoublons
) {
    public static DecisionDemandeDto vide() {
        return new DecisionDemandeDto(null, null, false);
    }
}
