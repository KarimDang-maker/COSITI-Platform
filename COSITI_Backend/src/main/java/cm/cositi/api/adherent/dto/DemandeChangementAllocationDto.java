package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.entite.DemandeChangementAllocation;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record DemandeChangementAllocationDto(
        UUID id,
        UUID adherentId,
        UUID packId,
        BigDecimal montantReference,
        BigDecimal allocationSecuriteSociale,
        BigDecimal allocationEpargne,
        String statut,
        UUID proposeePar,
        Instant proposeeLe,
        UUID decideePar,
        Instant decideeLe,
        String motifDecision
) {
    public static DemandeChangementAllocationDto depuis(DemandeChangementAllocation d) {
        return new DemandeChangementAllocationDto(d.getId(), d.getAdherentId(), d.getPackId(),
                d.getMontantReference(), d.getAllocationSecuriteSociale(), d.getAllocationEpargne(),
                d.getStatut().name(), d.getProposeePar(), d.getProposeeLe(), d.getDecideePar(), d.getDecideeLe(),
                d.getMotifDecision());
    }
}
