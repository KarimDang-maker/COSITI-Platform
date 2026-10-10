package cm.cositi.api.cnps.parcours;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record PreimmatriculationDto(
        @NotBlank @Size(max = 40) String numeroTemporaire,
        /** Date du récépissé ; aujourd'hui par défaut. */
        LocalDate datePreimmatriculation,
        UUID recepisseDocumentId) {
}
