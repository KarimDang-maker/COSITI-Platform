package cm.cositi.api.adhesion.dto;

import cm.cositi.api.adhesion.entite.DecisionControleDga;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Finalisation du contrôle (§15). Commentaire obligatoire pour une demande de correction ou un rejet.
 * {@code cleIdempotence} (ou en-tête {@code Idempotency-Key}) : un double envoi renvoie le résultat déjà enregistré.
 */
public record DecisionControleDgaDto(
        @NotNull(message = "La décision est obligatoire.") DecisionControleDga decision,
        @Size(max = 1000, message = "Le commentaire ne peut pas dépasser 1000 caractères.") String commentaire,
        @Size(max = 80, message = "La clé d'idempotence ne peut pas dépasser 80 caractères.") String cleIdempotence
) {
}
