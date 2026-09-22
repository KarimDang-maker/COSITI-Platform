package cm.cositi.api.cotisation.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CorrectionPaiementDto(
        BigDecimal montant,
        LocalDate datePaiement,
        String referenceTransaction,
        String motif
) {
}
