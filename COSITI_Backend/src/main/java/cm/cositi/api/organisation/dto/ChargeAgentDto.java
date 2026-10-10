package cm.cositi.api.organisation.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ChargeAgentDto(UUID agentId, String periode, int nombreAdherents, BigDecimal montantCollecte,
                              BigDecimal objectifCollecteMensuel) {
}
