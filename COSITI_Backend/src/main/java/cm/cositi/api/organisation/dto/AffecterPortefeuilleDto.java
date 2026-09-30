package cm.cositi.api.organisation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AffecterPortefeuilleDto(
        @NotNull(message = "L'adhérent est obligatoire.") UUID adherentId,
        @NotNull(message = "L'agent est obligatoire.") UUID agentId,
        String motif
) {
}
