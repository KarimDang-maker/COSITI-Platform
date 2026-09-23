package cm.cositi.api.cotisation.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ReceptionnerRemiseCaisseDto(@NotNull(message = "Le montant reçu est obligatoire.") BigDecimal montantRecu) {
}
