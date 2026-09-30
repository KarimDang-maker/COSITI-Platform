package cm.cositi.api.adherent.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Un pack de cotisation du référentiel (table `pack`, alimentée par la migration V2). */
public record PackDto(
        UUID id,
        String code,
        String libelle,
        BigDecimal montantJournalier,
        BigDecimal montantMensuelEquivalent,
        BigDecimal seuilEligibiliteCnps,
        boolean actif
) {
}
