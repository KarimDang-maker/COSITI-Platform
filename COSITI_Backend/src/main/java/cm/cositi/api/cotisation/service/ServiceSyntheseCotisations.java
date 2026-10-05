package cm.cositi.api.cotisation.service;

import cm.cositi.api.cotisation.dto.SyntheseCotisationsAdherentDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * Source de vérité des comptes et cumuls d'un adhérent (prompt §12) : total des cotisations, comptes Sécurité sociale
 * et Épargne, montants validé et en attente, reste avant seuil, taux de progression. Le frontend affiche, il ne
 * recalcule pas.
 */
public interface ServiceSyntheseCotisations {

    SyntheseCotisationsAdherentDto synthese(UUID adherentId, Utilisateur demandeur);

    /** Reste à cotiser avant le seuil : {@code max(seuil - cumul, 0)} ; nul sans seuil (pas de pack). */
    static BigDecimal resteAvantSeuil(BigDecimal seuil, BigDecimal cumul) {
        if (seuil == null) {
            return null;
        }
        return seuil.subtract(cumul).max(BigDecimal.ZERO);
    }

    /** {@code cumul / seuil × 100}, borné à [0, 100], 2 décimales ; nul sans seuil strictement positif. */
    static BigDecimal tauxProgression(BigDecimal seuil, BigDecimal cumul) {
        if (seuil == null || seuil.signum() <= 0) {
            return null;
        }
        BigDecimal taux = cumul.multiply(BigDecimal.valueOf(100)).divide(seuil, 2, RoundingMode.HALF_UP);
        return taux.min(BigDecimal.valueOf(100).setScale(2)).max(BigDecimal.ZERO.setScale(2));
    }
}
