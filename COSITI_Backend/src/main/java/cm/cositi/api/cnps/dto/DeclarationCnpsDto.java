package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.DeclarationCnps;
import cm.cositi.api.cnps.entite.StatutDeclarationCnps;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record DeclarationCnpsDto(
        UUID id,
        UUID dossierId,
        LocalDate periodeMois,
        BigDecimal montantDeclare,
        StatutDeclarationCnps statut,
        LocalDate dateTransmission,
        UUID accuseDocumentId,
        String creePar,
        List<String> avertissements
) {
    public static DeclarationCnpsDto depuis(DeclarationCnps d, List<String> avertissements) {
        return new DeclarationCnpsDto(d.getId(), d.getDossierId(), d.getPeriodeMois(), d.getMontantDeclare(),
                d.getStatut(), d.getDateTransmission(), d.getAccuseDocumentId(), d.getCreePar(), avertissements);
    }

    public static DeclarationCnpsDto depuis(DeclarationCnps d) {
        return depuis(d, List.of());
    }
}
