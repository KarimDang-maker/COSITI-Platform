package cm.cositi.api.administration.dto;

import jakarta.validation.constraints.NotBlank;

/** Activation ou désactivation d'un compte (UC-SA-03). Motif obligatoire, audité. */
public record ChangementActivationDto(boolean actif, @NotBlank String motif) {
}
