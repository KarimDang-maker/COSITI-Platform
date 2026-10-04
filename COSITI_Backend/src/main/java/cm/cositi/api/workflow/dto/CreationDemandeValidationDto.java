package cm.cositi.api.workflow.dto;

import cm.cositi.api.workflow.entite.TypeOperationWorkflow;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Création d'une demande (§15 {@code CreateValidationRequestCommand}). Le type d'entité se déduit de l'opération.
 *
 * @param versionBase   version de l'entité lue par le demandeur : si elle a changé depuis, 409 (§17). Facultative.
 * @param cleIdempotence une même clé renvoie la demande déjà créée (§18). Facultative.
 * @param soumettre     {@code true} : crée et soumet en une seule opération.
 */
public record CreationDemandeValidationDto(
        @NotNull(message = "Le type d'opération est obligatoire.") TypeOperationWorkflow typeOperation,
        @NotNull(message = "L'entité concernée est obligatoire.") UUID entiteId,
        @NotBlank(message = "Le motif de la demande est obligatoire.")
        @Size(max = 1000, message = "Le motif ne peut pas dépasser 1000 caractères.") String motif,
        @Valid List<PropositionChampDto> elements,
        List<UUID> documentIds,
        Long versionBase,
        @Size(max = 80, message = "La clé d'idempotence ne peut pas dépasser 80 caractères.") String cleIdempotence,
        boolean soumettre
) {
}
