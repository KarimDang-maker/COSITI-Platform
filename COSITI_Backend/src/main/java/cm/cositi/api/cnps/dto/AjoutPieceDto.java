package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.TypePieceCnps;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AjoutPieceDto(
        @NotNull UUID documentId,
        @NotNull TypePieceCnps typePiece
) {
}
