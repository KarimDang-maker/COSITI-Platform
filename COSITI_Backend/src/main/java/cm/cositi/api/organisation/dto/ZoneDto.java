package cm.cositi.api.organisation.dto;

import cm.cositi.api.organisation.entite.Zone;

import java.util.UUID;

public record ZoneDto(UUID id, String code, String libelle, String ville, String region, UUID zoneParenteId,
                       boolean active) {
    public static ZoneDto depuis(Zone z) {
        return new ZoneDto(z.getId(), z.getCode(), z.getLibelle(), z.getVille(), z.getRegion(),
                z.getZoneParenteId(), z.isActive());
    }
}
