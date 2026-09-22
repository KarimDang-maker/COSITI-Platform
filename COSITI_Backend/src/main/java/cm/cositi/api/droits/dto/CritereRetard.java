package cm.cositi.api.droits.dto;

import java.util.UUID;

/** Filtres de {@code GET /droits/retardataires} (docs/03_SPECIFICATIONS_API.md §5). */
public record CritereRetard(UUID zoneId, UUID agentId, Integer joursRetardMin, UUID packId) {
}
