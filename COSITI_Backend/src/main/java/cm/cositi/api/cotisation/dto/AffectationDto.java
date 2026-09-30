package cm.cositi.api.cotisation.dto;

import cm.cositi.api.cotisation.entite.AffectationPaiement;

import java.math.BigDecimal;
import java.util.UUID;

public record AffectationDto(UUID id, UUID paiementId, UUID composanteId, BigDecimal montant, String regleAppliquee) {
    public static AffectationDto depuis(AffectationPaiement a) {
        return new AffectationDto(a.getId(), a.getPaiementId(), a.getComposanteId(), a.getMontant(), a.getRegleAppliquee());
    }
}
