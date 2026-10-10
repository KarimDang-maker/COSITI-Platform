package cm.cositi.api.cnps.archivage;

import java.time.Instant;
import java.util.UUID;

public record LigneChecklistDto(
        String codePiece,
        String libelle,
        boolean bloquante,
        StatutArchivage statut,
        UUID documentId,
        String nomFichier,
        String referencePhysique,
        String motif,
        Instant modifieLe,
        String modifiePar) {
}
