package cm.cositi.api.workflow.dto;

import cm.cositi.api.workflow.entite.DocumentDemandeValidation;

import java.time.Instant;
import java.util.UUID;

public record DocumentDemandeValidationDto(
        UUID id,
        UUID documentId,
        String typeDocument,
        boolean obligatoire,
        UUID ajoutePar,
        Instant ajouteLe
) {
    public static DocumentDemandeValidationDto depuis(DocumentDemandeValidation d) {
        return new DocumentDemandeValidationDto(d.getId(), d.getDocumentId(), d.getTypeDocument(), d.isObligatoire(),
                d.getAjoutePar(), d.getAjouteLe());
    }
}
