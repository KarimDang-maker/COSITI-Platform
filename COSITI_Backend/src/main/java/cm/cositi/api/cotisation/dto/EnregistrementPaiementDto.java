package cm.cositi.api.cotisation.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EnregistrementPaiementDto(
        @NotNull(message = "L'adhérent est obligatoire.") UUID adherentId,
        @NotNull(message = "La date de paiement est obligatoire.") LocalDate datePaiement,
        @NotNull(message = "Le montant est obligatoire.")
        @DecimalMin(value = "0.01", message = "Le montant doit être strictement positif.") BigDecimal montant,
        @NotBlank(message = "Le mode de paiement est obligatoire.") String modePaiement,
        String referenceTransaction,
        @NotBlank(message = "Le type de paiement est obligatoire.") String typePaiement,
        UUID agentEncaisseurId
) {
}
