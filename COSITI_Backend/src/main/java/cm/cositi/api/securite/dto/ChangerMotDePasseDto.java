package cm.cositi.api.securite.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangerMotDePasseDto(
        @NotBlank(message = "L'ancien mot de passe est obligatoire.") String ancienMotDePasse,
        @NotBlank(message = "Le nouveau mot de passe est obligatoire.")
        @Size(min = 12, message = "Le nouveau mot de passe doit contenir au moins 12 caractères.")
        String nouveauMotDePasse
) {
}
