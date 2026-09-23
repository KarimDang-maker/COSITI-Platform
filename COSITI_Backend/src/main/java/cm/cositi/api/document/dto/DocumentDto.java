package cm.cositi.api.document.dto;

import cm.cositi.api.document.entite.AnalyseAntivirus;
import cm.cositi.api.document.entite.Document;
import cm.cositi.api.document.entite.StatutDocument;
import cm.cositi.api.document.entite.TypeDocument;

import java.time.Instant;
import java.util.UUID;

/**
 * Métadonnées d'un document, sans son contenu (docs/03_SPECIFICATIONS_API.md §8).
 *
 * <p>L'empreinte SHA-256 et le chemin de stockage ne sont <b>pas</b> exposés : le premier est une donnée
 * sensible (il permet de confirmer qu'on détient le même fichier), le second est un détail d'implémentation
 * qui n'a aucune raison de sortir du serveur.</p>
 */
public record DocumentDto(
        UUID id,
        TypeDocument typeDocument,
        String nomFichierOriginal,
        String typeMime,
        long tailleOctets,
        boolean chiffre,
        UUID adherentId,
        UUID paiementId,
        StatutDocument statut,
        AnalyseAntivirus analyseAntivirus,
        boolean telechargeable,
        Instant creeLe,
        String creePar
) {
    public static DocumentDto depuis(Document d) {
        return new DocumentDto(d.getId(), d.getTypeDocument(), d.getNomFichierOriginal(), d.getTypeMime(),
                d.getTailleOctets(), d.isChiffre(), d.getAdherentId(), d.getPaiementId(), d.getStatut(),
                d.getAnalyseAntivirus(), d.estTelechargeable(), d.getCreeLe(), d.getCreePar());
    }
}
