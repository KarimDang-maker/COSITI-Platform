package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.NotNull;

/** Décision du DAF (RAPORT_V1.md §6.11 : approuver ou rejeter, jamais modifier la proposition). */
public record DecisionChangementAllocationDto(
        @NotNull(message = "La décision est obligatoire.") Boolean approuver,
        String motif
) {
}
