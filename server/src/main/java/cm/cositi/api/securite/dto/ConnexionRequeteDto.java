package cm.cositi.api.securite.dto;

import jakarta.validation.constraints.NotBlank;

public record ConnexionRequeteDto(
    @NotBlank(message = "L'identifiant est obligatoire.")
    String identifiant,

    @NotBlank(message = "Le mot de passe est obligatoire.")
    String motDePasse,

    String codeMfa
) {}
