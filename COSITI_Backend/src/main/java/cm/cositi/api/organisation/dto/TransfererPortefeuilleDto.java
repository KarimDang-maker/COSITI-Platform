package cm.cositi.api.organisation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record TransfererPortefeuilleDto(
        @NotEmpty(message = "Au moins un adhérent est requis.") List<UUID> adherentIds,
        @NotNull(message = "Le nouvel agent est obligatoire.") UUID nouvelAgentId,
        @NotBlank(message = "Le motif est obligatoire.") String motif
) {
}
