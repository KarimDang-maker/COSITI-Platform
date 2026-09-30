package cm.cositi.api.organisation.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * #14, #15 — cotisations collectées par un agent sur une période. Composé à partir du journal des
 * paiements existant ({@code ServicePaiement.journal}), aucun nouveau calcul financier.
 */
public record ResumeCotisationsAgentDto(
        UUID agentId,
        String periode,
        int nombrePaiements,
        BigDecimal montantValide,
        BigDecimal montantEnAttente,
        BigDecimal montantAnnule
) {
}
