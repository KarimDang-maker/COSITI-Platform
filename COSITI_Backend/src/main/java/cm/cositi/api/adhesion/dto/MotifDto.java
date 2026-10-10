package cm.cositi.api.adhesion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Motif obligatoire (signalement d'anomalie). */
public record MotifDto(
        @NotBlank(message = "Le motif est obligatoire.")
        @Size(max = 1000, message = "Le motif ne peut pas dépasser 1000 caractères.") String motif
) {
}
