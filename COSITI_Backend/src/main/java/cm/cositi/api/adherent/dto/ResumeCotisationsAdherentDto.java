package cm.cositi.api.adherent.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Résumé des cotisations d'un adhérent (#28) : composé de {@code ServiceCalculDroits.situation}
 * (cumul validé, solde avant seuil, éligibilité) et d'une lecture du journal des paiements pour le
 * montant en attente — aucune nouvelle formule financière, uniquement une agrégation de lectures
 * existantes.
 */
public record ResumeCotisationsAdherentDto(
        UUID adherentId,
        BigDecimal montantValide,
        BigDecimal montantEnAttente,
        BigDecimal seuilEligibiliteCnps,
        BigDecimal resteAvantSeuil,
        BigDecimal pourcentageProgression,
        boolean eligibleCnps,
        LocalDate couvertJusquAu,
        List<String> avertissements
) {
}
