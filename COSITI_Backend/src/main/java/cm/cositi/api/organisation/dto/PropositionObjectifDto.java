package cm.cositi.api.organisation.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Proposition d'objectif de recouvrement (Gestionnaire ou Chef) — RAPORT_V1.md §6.5. */
public record PropositionObjectifDto(
        @NotNull(message = "La période est obligatoire.") LocalDate periode,
        @NotNull(message = "Le montant est obligatoire.")
        @DecimalMin(value = "0.01", message = "Le montant doit être strictement positif.") BigDecimal montant
) {
}
