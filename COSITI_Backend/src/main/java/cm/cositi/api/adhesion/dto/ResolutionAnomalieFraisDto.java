package cm.cositi.api.adhesion.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Résolution d'une anomalie de frais. {@code montantRecuCorrige} (facultatif) corrige le montant constaté — la
 * correction est tracée avant/après dans l'audit, jamais silencieuse.
 */
public record ResolutionAnomalieFraisDto(
        @NotBlank(message = "La résolution est obligatoire.")
        @Size(max = 1000, message = "La résolution ne peut pas dépasser 1000 caractères.") String resolution,
        @DecimalMin(value = "0.01", message = "Le montant corrigé doit être strictement positif.") BigDecimal montantRecuCorrige
) {
}
