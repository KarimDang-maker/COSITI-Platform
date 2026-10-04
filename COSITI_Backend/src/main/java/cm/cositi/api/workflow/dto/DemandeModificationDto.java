package cm.cositi.api.workflow.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Demande de modification d'une donnée officielle, depuis la route du module ({@code /adherents/{id}/demandes-
 * modification}, {@code /agents/{id}/demandes-modification}, {@code /paiements/{id}/demandes-correction}). L'entité
 * et l'opération viennent de l'URL. Soumise immédiatement sauf {@code brouillon = true}.
 */
public record DemandeModificationDto(
        @NotBlank(message = "Le motif de la demande est obligatoire.")
        @Size(max = 1000, message = "Le motif ne peut pas dépasser 1000 caractères.") String motif,
        @NotEmpty(message = "Au moins un champ à modifier est requis.") @Valid List<PropositionChampDto> elements,
        List<UUID> documentIds,
        Long versionBase,
        @Size(max = 80, message = "La clé d'idempotence ne peut pas dépasser 80 caractères.") String cleIdempotence,
        boolean brouillon
) {
}
