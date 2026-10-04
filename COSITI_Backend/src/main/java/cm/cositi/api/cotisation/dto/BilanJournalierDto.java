package cm.cositi.api.cotisation.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Bilan journalier numérique (#29) : ce que la plateforme a enregistré pour la date, et le montant auquel la caisse
 * physique doit être comparée. La définition du « montant numérique » (modes et statuts inclus) vit dans les
 * paramètres {@code BILAN_CAISSE_*} au statut {@code [V]} — signalée dans {@code avertissements}.
 */
public record BilanJournalierDto(
        LocalDate date,
        long nombrePaiements,
        BigDecimal montantTotalEnregistre,
        BigDecimal montantNumerique,
        int nombrePaiementsNumerique,
        Map<String, StatistiquesQuotidiennesDto.AgregatDto> parMode,
        List<String> modesNumerique,
        List<String> statutsInclus,
        RapprochementCaisseDto rapprochement,
        List<String> avertissements
) {
}
