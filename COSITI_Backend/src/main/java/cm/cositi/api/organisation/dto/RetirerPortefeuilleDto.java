package cm.cositi.api.organisation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** #17 — retrait d'affectation (clôture logique, sans réaffectation immédiate). */
public record RetirerPortefeuilleDto(
        @NotNull(message = "L'adhérent est obligatoire.") UUID adherentId,
        @NotBlank(message = "Le motif est obligatoire.") String motif
) {
}
