package cm.cositi.api.cotisation.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CorrectionPaiementDto(
        BigDecimal montant,
        LocalDate datePaiement,
        String referenceTransaction,
        String motif,
        /** Nouvelle répartition : obligatoire quand le montant d'une cotisation répartie par le Gestionnaire change. */
        BigDecimal montantSecuriteSociale,
        BigDecimal montantEpargne
) {
    public CorrectionPaiementDto(BigDecimal montant, LocalDate datePaiement, String referenceTransaction, String motif) {
        this(montant, datePaiement, referenceTransaction, motif, null, null);
    }
}
