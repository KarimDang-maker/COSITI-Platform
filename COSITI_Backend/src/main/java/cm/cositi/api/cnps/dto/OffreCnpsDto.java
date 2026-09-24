package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.OffreCnps;

import java.util.List;
import java.util.UUID;

/** {@code nombreDossiers} : compté par le serveur — le frontend ne recalcule jamais un KPI métier (§6 du contrat). */
public record OffreCnpsDto(
        UUID id,
        String rubrique,
        String code,
        String libelle,
        String description,
        String delaiLibelle,
        String badgeMetier,
        int ordreAffichage,
        List<PieceOffreCnpsDto> pieces,
        long nombreDossiers
) {
    public static OffreCnpsDto depuis(OffreCnps o, List<PieceOffreCnpsDto> pieces, long nombreDossiers) {
        return new OffreCnpsDto(o.getId(), o.getRubrique(), o.getCode(), o.getLibelle(), o.getDescription(),
                o.getDelaiLibelle(), o.getBadgeMetier(), o.getOrdreAffichage(), pieces, nombreDossiers);
    }
}
