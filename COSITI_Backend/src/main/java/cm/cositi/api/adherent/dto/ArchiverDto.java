package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.NotBlank;

public record ArchiverDto(@NotBlank(message = "Le motif est obligatoire.") String motif) {
}
