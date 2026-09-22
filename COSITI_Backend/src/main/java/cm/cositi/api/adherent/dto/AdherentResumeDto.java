package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.StatutAdherent;

import java.util.UUID;

public record AdherentResumeDto(
        UUID id,
        String matricule,
        String nomComplet,
        String telephonePrincipal,
        UUID zoneId,
        StatutAdherent statut
) {
    public static AdherentResumeDto depuis(Adherent a) {
        return new AdherentResumeDto(a.getId(), a.getMatricule(), a.getNomComplet(), a.getTelephonePrincipal(),
                a.getZoneId(), a.getStatut());
    }
}
