package cm.cositi.api.audit;

import java.time.Instant;
import java.util.UUID;

public record AuditLigneDto(
        UUID id,
        Instant horodatage,
        UUID utilisateurId,
        String utilisateurIdentifiant,
        TypeOperation typeOperation,
        String entite,
        UUID entiteId,
        String motif,
        String resultat
) {
    public static AuditLigneDto depuis(JournalAudit j) {
        return new AuditLigneDto(j.getId(), j.getHorodatage(), j.getUtilisateurId(), j.getUtilisateurIdentifiant(),
                j.getTypeOperation(), j.getEntite(), j.getEntiteId(), j.getMotif(), j.getResultat());
    }
}
