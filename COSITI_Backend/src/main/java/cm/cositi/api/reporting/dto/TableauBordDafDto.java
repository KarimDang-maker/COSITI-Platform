package cm.cositi.api.reporting.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Tableau de bord du DAF (Roles des acteurs.md §6) : vision financière interne (UC-DAF-01).
 *
 * <p>Rappel porté par le dashboard lui-même : COSITI enregistre des informations de paiement mais
 * n'exécute aucun mouvement de fonds. Les montants affichés sont des encaissements déclarés puis
 * contrôlés, jamais un solde de trésorerie.</p>
 */
public record TableauBordDafDto(
        List<IndicateurCle> indicateurs,
        long paiementsAControler,
        long paiementsIncoherence,
        long remisesEnEcart,
        BigDecimal montantAControler,
        BigDecimal montantValide,
        List<Alerte> alertes,
        List<String> avertissements
) {
}
