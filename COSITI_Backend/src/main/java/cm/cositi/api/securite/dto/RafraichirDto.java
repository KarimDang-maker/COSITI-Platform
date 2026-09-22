package cm.cositi.api.securite.dto;

import jakarta.validation.constraints.NotBlank;

public record RafraichirDto(
        @NotBlank(message = "Le jeton de rafraîchissement est obligatoire.") String jetonRafraichissement
) {
}
