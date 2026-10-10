package cm.cositi.api.relance.dto;

import cm.cositi.api.relance.entite.CanalRelance;
import cm.cositi.api.relance.entite.Relance;
import cm.cositi.api.relance.entite.ResultatRelance;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record RelanceDto(
        UUID id,
        UUID adherentId,
        UUID campagneId,
        UUID responsableUtilisateurId,
        CanalRelance canal,
        Instant dateContact,
        ResultatRelance resultat,
        LocalDate prochaineActionLe,
        String commentaire
) {
    public static RelanceDto depuis(Relance r) {
        return new RelanceDto(r.getId(), r.getAdherentId(), r.getCampagneId(), r.getResponsableUtilisateurId(),
                r.getCanal(), r.getDateContact(), r.getResultat(), r.getProchaineActionLe(), r.getCommentaire());
    }
}
