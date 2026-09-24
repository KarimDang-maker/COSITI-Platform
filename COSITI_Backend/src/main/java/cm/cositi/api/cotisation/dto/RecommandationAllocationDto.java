package cm.cositi.api.cotisation.dto;

import cm.cositi.api.cotisation.entite.RecommandationAllocationPaiement;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Donnée métier structurée (correctif COSITI V1 §8) — jamais un commentaire libre — pour la recommandation
 * d'allocation Sécurité Sociale/Épargne qu'un agent recueille auprès de l'adhérent lors d'un paiement
 * supérieur à 1000 FCFA.
 */
public record RecommandationAllocationDto(
        BigDecimal allocationSecuriteSociale,
        BigDecimal allocationEpargne,
        UUID recueilliParId,
        Instant creeLe
) {
    public static RecommandationAllocationDto depuis(RecommandationAllocationPaiement r) {
        return new RecommandationAllocationDto(r.getAllocationSecuriteSociale(), r.getAllocationEpargne(),
                r.getRecueilliParId(), r.getCreeLe());
    }
}
