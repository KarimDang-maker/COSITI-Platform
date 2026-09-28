package cm.cositi.api.cotisation.dto;

import cm.cositi.api.cotisation.entite.RemiseCaisse;

import java.math.BigDecimal;
import java.util.UUID;

public record RemiseCaisseDto(UUID id, UUID agentId, BigDecimal montantDeclare, BigDecimal montantRecu,
                               BigDecimal ecart, String statut) {
    public static RemiseCaisseDto depuis(RemiseCaisse r) {
        return new RemiseCaisseDto(r.getId(), r.getAgentId(), r.getMontantDeclare(), r.getMontantRecu(),
                r.getEcart(), r.getStatut());
    }
}
