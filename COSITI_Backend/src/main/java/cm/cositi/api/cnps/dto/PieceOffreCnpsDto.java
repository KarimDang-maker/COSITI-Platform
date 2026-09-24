package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.PieceOffreCnps;

import java.util.UUID;

public record PieceOffreCnpsDto(UUID id, UUID offreId, String libelle, boolean obligatoire) {
    public static PieceOffreCnpsDto depuis(PieceOffreCnps p) {
        return new PieceOffreCnpsDto(p.getId(), p.getOffreId(), p.getLibelle(), p.isObligatoire());
    }
}
