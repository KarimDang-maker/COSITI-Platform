package cm.cositi.api.organisation.dto;

import java.util.UUID;

/** #19 — répartition des portefeuilles ouverts entre agents actifs. */
public record DistributionPortefeuilleDto(
        UUID agentId,
        String codeAgent,
        String nomComplet,
        long nombreAdherents
) {
}
