package cm.cositi.api.cotisation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Signalement d'une anomalie sur un bilan journalier (#33) — motif obligatoire. */
public record SignalerAnomalieBilanDto(
        @NotBlank(message = "Le motif de l'anomalie est obligatoire.")
        @Size(max = 1000, message = "Le motif ne peut pas dépasser 1000 caractères.") String motif
) {
}
