package cm.cositi.api.organisation.dto;

import java.util.UUID;

public record CritereRechercheAgent(
        String recherche,
        Boolean actif,
        UUID zoneId
) {
}
