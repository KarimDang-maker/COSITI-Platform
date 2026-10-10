package cm.cositi.api.cnps.archivage;

import java.util.List;
import java.util.UUID;

/** Une ligne du rapport « dossiers dont l'archivage est incomplet ». */
public record DossierIncompletDto(
        UUID dossierId,
        UUID adherentId,
        String matricule,
        String nomComplet,
        List<String> piecesManquantes) {
}
