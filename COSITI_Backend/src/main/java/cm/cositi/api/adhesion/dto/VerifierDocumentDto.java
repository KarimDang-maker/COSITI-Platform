package cm.cositi.api.adhesion.dto;

import cm.cositi.api.adhesion.entite.StatutCorrespondance;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Constat sur un document entier : {@code DOCUMENT_MANQUANT} ou {@code NON_LISIBLE}, appliqué à toutes ses informations. */
public record VerifierDocumentDto(
        @NotNull(message = "Le constat est obligatoire.") StatutCorrespondance statut,
        @NotBlank(message = "Le commentaire est obligatoire.")
        @Size(max = 1000, message = "Le commentaire ne peut pas dépasser 1000 caractères.") String commentaire
) {
}
