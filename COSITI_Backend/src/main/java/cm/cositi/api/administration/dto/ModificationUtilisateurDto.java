package cm.cositi.api.administration.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Modification des informations d'un compte (UC-SA-02). Les rôles se modifient par un appel dédié. */
public record ModificationUtilisateurDto(
        @NotBlank String nomComplet,
        @Email String email,
        String telephone
) {
}
