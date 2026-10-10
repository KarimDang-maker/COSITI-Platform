package cm.cositi.api.cnps.archivage;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record MiseAJourChecklistDto(
        @NotNull StatutArchivage statut,
        UUID documentId,
        @Size(max = 200) String referencePhysique,
        /** Obligatoire pour retirer ou remplacer une pièce. */
        String motif) {
}
