package cm.cositi.api.cotisation.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record LigneAffectationDto(
        @NotNull(message = "La composante est obligatoire.") UUID composanteId,
        @NotNull(message = "Le montant est obligatoire.")
        @DecimalMin(value = "0.01", message = "Le montant doit être strictement positif.") BigDecimal montant
) {
}
