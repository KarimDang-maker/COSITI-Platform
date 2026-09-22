package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record ChangerPackDto(
        @NotNull(message = "Le nouveau pack est obligatoire.") UUID packId,
        @NotNull(message = "La date d'effet est obligatoire.") LocalDate effetLe
) {
}
