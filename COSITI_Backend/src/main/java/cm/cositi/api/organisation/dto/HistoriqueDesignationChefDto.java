package cm.cositi.api.organisation.dto;

import cm.cositi.api.organisation.entite.HistoriqueDesignationChef;

import java.time.Instant;
import java.util.UUID;

public record HistoriqueDesignationChefDto(
        UUID id, UUID zoneId, UUID agentId, UUID agentRemplaceId, UUID designePar, String motif, Instant horodatage
) {
    public static HistoriqueDesignationChefDto depuis(HistoriqueDesignationChef h) {
        return new HistoriqueDesignationChefDto(h.getId(), h.getZoneId(), h.getAgentId(), h.getAgentRemplaceId(),
                h.getDesignePar(), h.getMotif(), h.getHorodatage());
    }
}
