package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.PieceDossierPrestationCnps;
import cm.cositi.api.cnps.entite.StatutPieceCnps;

import java.util.UUID;

public record PieceDossierPrestationCnpsDto(
        UUID id,
        UUID dossierId,
        UUID pieceOffreId,
        String libellePiece,
        boolean obligatoire,
        UUID documentId,
        StatutPieceCnps statut,
        String note
) {
    public static PieceDossierPrestationCnpsDto depuis(PieceDossierPrestationCnps p, String libellePiece,
                                                         boolean obligatoire) {
        return new PieceDossierPrestationCnpsDto(p.getId(), p.getDossierId(), p.getPieceOffreId(), libellePiece,
                obligatoire, p.getDocumentId(), p.getStatut(), p.getNote());
    }
}
