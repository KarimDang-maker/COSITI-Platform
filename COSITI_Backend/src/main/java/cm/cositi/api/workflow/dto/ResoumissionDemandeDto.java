package cm.cositi.api.workflow.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Resoumission après correction demandée. {@code elements} (facultatif) remplace les propositions d'une demande
 * de modification ; pour une validation de dossier, l'instantané est reconstruit depuis le dossier corrigé.
 */
public record ResoumissionDemandeDto(
        @Size(max = 1000, message = "Le commentaire ne peut pas dépasser 1000 caractères.") String commentaire,
        @Valid List<PropositionChampDto> elements,
        @Size(max = 80, message = "La clé d'idempotence ne peut pas dépasser 80 caractères.") String cleIdempotence
) {
}
