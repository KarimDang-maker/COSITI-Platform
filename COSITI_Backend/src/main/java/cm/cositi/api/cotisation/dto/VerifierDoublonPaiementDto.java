package cm.cositi.api.cotisation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Contrôle de doublon avant saisie (#13) — mêmes champs que l'enregistrement, sans rien créer. */
public record VerifierDoublonPaiementDto(
        @NotNull(message = "L'adhérent est obligatoire.") UUID adherentId,
        LocalDate datePaiement,
        BigDecimal montant,
        @NotBlank(message = "Le mode de paiement est obligatoire.") String modePaiement,
        String referenceTransaction
) {
}
