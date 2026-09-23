package cm.cositi.api.commun.reponse;

import java.time.Instant;
import java.util.List;

/** Enveloppe d'erreur normalisée unique (voir docs/02_CLASSES_ET_METHODES.md §9). */
public record ReponseErreur(
        Instant horodatage,
        int statut,
        String code,
        String message,
        String champ,
        String traceId,
        List<String> avertissements
) {
    public ReponseErreur(int statut, String code, String message, String champ, String traceId) {
        this(Instant.now(), statut, code, message, champ, traceId, List.of());
    }

    public ReponseErreur avecAvertissements(List<String> avertissements) {
        return new ReponseErreur(horodatage, statut, code, message, champ, traceId, avertissements);
    }
}
