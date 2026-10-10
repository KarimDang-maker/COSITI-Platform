package cm.cositi.api.cotisation.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

/** Statistiques d'une journée de collecte (#27), limitées au périmètre du demandeur. */
public record StatistiquesQuotidiennesDto(
        LocalDate date,
        long nombreTotal,
        BigDecimal montantTotal,
        Map<String, AgregatDto> parStatut,
        Map<String, AgregatDto> parMode
) {
    public record AgregatDto(long nombre, BigDecimal montant) {
    }
}
