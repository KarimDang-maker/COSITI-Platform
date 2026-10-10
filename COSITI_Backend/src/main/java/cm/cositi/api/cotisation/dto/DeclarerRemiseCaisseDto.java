package cm.cositi.api.cotisation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record DeclarerRemiseCaisseDto(
        @NotNull(message = "L'agent est obligatoire.") UUID agentId,
        @NotEmpty(message = "Au moins un paiement est requis.") List<UUID> paiementIds
) {
}
