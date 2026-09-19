package cm.cositi.api.cotisation.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EnregistrementPaiementDto(
    @NotNull(message = "L'identifiant de l'adhérent est obligatoire.")
    UUID adherentId,

    @NotNull(message = "La date du paiement est obligatoire.")
    @PastOrPresent(message = "La date de paiement ne peut pas être future.")
    LocalDate datePaiement,

    @NotNull(message = "Le montant est obligatoire.")
    @DecimalMin(value = "1.00", message = "Le montant doit être strictement supérieur à 0.")
    BigDecimal montant,

    @NotBlank(message = "Le mode de paiement est obligatoire (ESPECES, ORANGE_MONEY, MTN_MOMO, VIREMENT).")
    String modePaiement,

    String referenceTransaction,

    String typePaiement, // COTISATION ou INSCRIPTION

    UUID agentEncaisseurId,

    String cleIdempotence
) {}
