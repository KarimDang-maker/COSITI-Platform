package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.PieceDossierCnps;
import cm.cositi.api.cnps.entite.StatutPieceCnps;
import cm.cositi.api.cnps.entite.TypePieceCnps;

import java.util.UUID;

public record PieceDossierCnpsDto(
        UUID id,
        UUID dossierId,
        TypePieceCnps typePiece,
        UUID documentId,
        StatutPieceCnps statut,
        boolean obligatoire
) {
    public static PieceDossierCnpsDto depuis(PieceDossierCnps p) {
        return new PieceDossierCnpsDto(p.getId(), p.getDossierId(), p.getTypePiece(), p.getDocumentId(),
                p.getStatut(), p.isObligatoire());
    }
}
