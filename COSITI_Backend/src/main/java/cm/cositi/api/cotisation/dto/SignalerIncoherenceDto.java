package cm.cositi.api.cotisation.dto;

import jakarta.validation.constraints.NotBlank;

/** Signalement d'incohérence par le DAF (jalon J5) — motif obligatoire. */
public record SignalerIncoherenceDto(@NotBlank(message = "Le motif de l'incohérence est obligatoire.") String motif) {
}
