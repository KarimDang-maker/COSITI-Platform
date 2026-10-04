package cm.cositi.api.cotisation.dto;

import cm.cositi.api.cotisation.entite.AffectationPaiement;
import cm.cositi.api.cotisation.entite.ComposanteAffectation;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Ligne d'affectation d'une cotisation. {@code composanteCode} / {@code composanteLibelle} (V21, additifs) nomment la
 * composante (« Sécurité sociale », « Épargne ») : l'écran n'a pas à la deviner à partir de son identifiant.
 */
public record AffectationDto(UUID id, UUID paiementId, UUID composanteId, BigDecimal montant, String regleAppliquee,
                             String composanteCode, String composanteLibelle) {
    public static AffectationDto depuis(AffectationPaiement a) {
        return new AffectationDto(a.getId(), a.getPaiementId(), a.getComposanteId(), a.getMontant(), a.getRegleAppliquee(),
                null, null);
    }

    public static AffectationDto depuis(AffectationPaiement a, ComposanteAffectation composante) {
        return new AffectationDto(a.getId(), a.getPaiementId(), a.getComposanteId(), a.getMontant(), a.getRegleAppliquee(),
                composante != null ? composante.getCode() : null, composante != null ? composante.getLibelle() : null);
    }
}
