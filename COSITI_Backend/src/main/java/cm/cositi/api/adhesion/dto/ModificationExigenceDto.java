package cm.cositi.api.adhesion.dto;

import cm.cositi.api.adhesion.entite.NiveauExigence;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Modification d'une exigence documentaire (décision de la COSITI). Ne la confirme pas : la confirmation reste un acte
 * distinct ({@code POST /regles/exigences/{id}/valider}).
 *
 * @param version version lue (facultative) : 409 si l'exigence a changé depuis
 */
public record ModificationExigenceDto(
        @NotNull(message = "Le niveau est obligatoire.") NiveauExigence niveau,
        @Size(max = 1000, message = "La condition ne peut pas dépasser 1000 caractères.") String conditionApplication,
        boolean verificationDga,
        boolean actif,
        LocalDate effectifDu,
        LocalDate effectifJusquau,
        @NotBlank(message = "Le motif est obligatoire.")
        @Size(max = 1000, message = "Le motif ne peut pas dépasser 1000 caractères.") String motif,
        Long version
) {
}
