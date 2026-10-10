package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.entite.Association;

import java.time.LocalDate;
import java.util.UUID;

/** Association partenaire (référentiel en lecture seule — {@code adherent.association_id}). */
public record AssociationDto(
        UUID id,
        String code,
        String nom,
        String type,
        String contactNom,
        String contactTelephone,
        UUID zoneId,
        LocalDate dateConvention,
        boolean active
) {
    public static AssociationDto depuis(Association a) {
        return new AssociationDto(a.getId(), a.getCode(), a.getNom(), a.getType(), a.getContactNom(),
                a.getContactTelephone(), a.getZoneId(), a.getDateConvention(), a.isActive());
    }
}
