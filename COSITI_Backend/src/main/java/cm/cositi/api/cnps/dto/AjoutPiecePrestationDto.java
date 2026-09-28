package cm.cositi.api.cnps.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AjoutPiecePrestationDto(
        @NotNull UUID documentId,
        @NotNull UUID pieceOffreId
) {
}
