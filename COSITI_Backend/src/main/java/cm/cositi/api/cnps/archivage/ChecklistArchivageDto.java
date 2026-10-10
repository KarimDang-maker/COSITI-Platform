package cm.cositi.api.cnps.archivage;

import java.util.List;
import java.util.UUID;

public record ChecklistArchivageDto(
        UUID dossierId,
        UUID adherentId,
        List<LigneChecklistDto> lignes,
        int piecesBloquantes,
        int piecesBloquantesPretes,
        /** Vrai si toutes les pièces bloquantes sont vérifiées ou archivées : l'immatriculation est possible. */
        boolean complete) {
}
