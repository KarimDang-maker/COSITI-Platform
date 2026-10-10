package cm.cositi.api.cotisation.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Saisie du montant physique compté pour une journée (#30). */
public record SaisirCaissePhysiqueDto(
        @NotNull(message = "La date du bilan est obligatoire.") LocalDate date,
        @NotNull(message = "Le montant physique est obligatoire.")
        @DecimalMin(value = "0.00", message = "Le montant physique ne peut pas être négatif.") BigDecimal montantPhysique,
        @Size(max = 1000, message = "Le commentaire ne peut pas dépasser 1000 caractères.") String commentaire
) {
}
