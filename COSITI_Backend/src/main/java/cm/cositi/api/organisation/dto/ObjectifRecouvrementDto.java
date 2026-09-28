package cm.cositi.api.organisation.dto;

import cm.cositi.api.organisation.entite.ObjectifRecouvrement;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ObjectifRecouvrementDto(
        UUID id,
        UUID agentId,
        LocalDate periode,
        BigDecimal montant,
        String statut,
        UUID proposePar,
        Instant proposeLe,
        UUID decidePar,
        Instant decideLe,
        String motifDecision
) {
    public static ObjectifRecouvrementDto depuis(ObjectifRecouvrement o) {
        return new ObjectifRecouvrementDto(o.getId(), o.getAgentId(), o.getPeriode(), o.getMontant(),
                o.getStatut().name(), o.getProposePar(), o.getProposeLe(), o.getDecidePar(), o.getDecideLe(),
                o.getMotifDecision());
    }
}
