package cm.cositi.api.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Proposition d'un champ (§15 {@code ValidationRequestItemCommand}). {@code valeurProposee} est transmise en texte
 * (dates ISO {@code AAAA-MM-JJ}, décimaux avec point) ; {@code null} ou vide efface un champ facultatif.
 */
public record PropositionChampDto(
        @NotBlank(message = "Le champ est obligatoire.") String champ,
        @Size(max = 500, message = "La valeur proposée ne peut pas dépasser 500 caractères.") String valeurProposee,
        @Size(max = 1000, message = "Le motif ne peut pas dépasser 1000 caractères.") String motifChangement
) {
}
