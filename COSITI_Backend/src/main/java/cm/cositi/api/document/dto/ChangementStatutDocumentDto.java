package cm.cositi.api.document.dto;

import cm.cositi.api.document.entite.StatutDocument;
import jakarta.validation.constraints.NotNull;

public record ChangementStatutDocumentDto(
        @NotNull StatutDocument statut,
        String motif
) {
}
