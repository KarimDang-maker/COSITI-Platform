package cm.cositi.api.cotisation.dto;

import cm.cositi.api.cotisation.entite.RemiseCaisse;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Remise de caisse : espèces collectées par un agent, déclarées puis réceptionnées par le DAF. Les champs ajoutés
 * (date, réception, nombre de cotisations) sont additifs.
 */
public record RemiseCaisseDto(UUID id, UUID agentId, BigDecimal montantDeclare, BigDecimal montantRecu,
                               BigDecimal ecart, String statut, java.time.LocalDate dateRemise,
                               java.time.Instant recuLe, java.time.Instant creeLe, Integer nombrePaiements) {
    public RemiseCaisseDto(UUID id, UUID agentId, BigDecimal montantDeclare, BigDecimal montantRecu, BigDecimal ecart,
                           String statut) {
        this(id, agentId, montantDeclare, montantRecu, ecart, statut, null, null, null, null);
    }

    public static RemiseCaisseDto depuis(RemiseCaisse r) {
        return depuis(r, null);
    }

    public static RemiseCaisseDto depuis(RemiseCaisse r, Integer nombrePaiements) {
        return new RemiseCaisseDto(r.getId(), r.getAgentId(), r.getMontantDeclare(), r.getMontantRecu(),
                r.getEcart(), r.getStatut(), r.getDateRemise(), r.getRecuLe(), r.getCreeLe(), nombrePaiements);
    }
}
