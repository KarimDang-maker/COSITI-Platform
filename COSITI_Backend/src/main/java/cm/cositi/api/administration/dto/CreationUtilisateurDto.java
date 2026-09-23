package cm.cositi.api.administration.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Création d'un compte par le Super Administrateur (UC-SA-01).
 *
 * <p>Aucun mot de passe n'est fourni : il est généré aléatoirement par le serveur et révélé une seule
 * fois, comme pour l'ajout d'un agent par la DGA (jalon J3). Laisser l'administrateur choisir le mot de
 * passe d'un autre compte en ferait un secret partagé dès sa création.</p>
 */
public record CreationUtilisateurDto(
        @NotBlank String identifiant,
        @NotBlank String nomComplet,
        @Email String email,
        String telephone,
        @NotEmpty List<String> roles
) {
}
