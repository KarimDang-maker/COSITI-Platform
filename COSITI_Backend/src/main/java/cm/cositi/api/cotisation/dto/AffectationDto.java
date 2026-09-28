package cm.cositi.api.cotisation.dto;

import cm.cositi.api.cotisation.entite.AffectationPaiement;

import java.math.BigDecimal;
import java.util.UUID;

public record AffectationDto(UUID id, UUID paiementId, UUID composanteId, String composanteCode, BigDecimal montant,
                              String regleAppliquee) {
    public static AffectationDto depuis(AffectationPaiement a) {
        return depuis(a, null);
    }

    /** Forme destinée à l'affichage (§8 : « afficher clairement cette répartition »). */
    public static AffectationDto depuis(AffectationPaiement a, String composanteCode) {
        return new AffectationDto(a.getId(), a.getPaiementId(), a.getComposanteId(), composanteCode, a.getMontant(),
                a.getRegleAppliquee());
    }
}
