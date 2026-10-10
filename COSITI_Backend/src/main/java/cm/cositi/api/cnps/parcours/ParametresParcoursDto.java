package cm.cositi.api.cnps.parcours;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** Lecture et modification (DAF) des règles de la préimmatriculation. */
public record ParametresParcoursDto(
        @NotNull BigDecimal quotaPreimmat,
        @NotNull BigDecimal quotaImmat,
        @NotNull Integer jourCoupure,
        @NotNull Integer delaiDepotJours,
        /** Obligatoire à la modification. */
        @NotBlank String motif) {
}
