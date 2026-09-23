package cm.cositi.api.droits.dto;

import jakarta.validation.constraints.NotBlank;

/** Réservé DAF/SUPER_ADMIN (docs/02_CLASSES_ET_METHODES.md §5) — motif obligatoire. */
public record RecalculerDroitsDto(@NotBlank(message = "Le motif du recalcul est obligatoire.") String motif) {
}
