package cm.cositi.api.organisation.dto;

import jakarta.validation.constraints.NotNull;

/** Décision de la DGA (RAPORT_V1.md §6.11 : approuver ou rejeter, jamais modifier la proposition). */
public record DecisionObjectifDto(
        @NotNull(message = "La décision est obligatoire.") Boolean approuver,
        String motif
) {
}
