package cm.cositi.api.administration.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Attribution ou retrait de rôles (UC-SA-04). Le motif est obligatoire : un changement d'habilitation est
 * une décision, et l'historique doit en garder la raison, pas seulement la trace.
 */
public record ChangementRolesDto(
        @NotNull List<String> roles,
        @NotBlank String motif
) {
}
