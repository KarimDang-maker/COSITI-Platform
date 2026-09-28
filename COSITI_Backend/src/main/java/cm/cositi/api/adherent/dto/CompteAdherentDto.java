package cm.cositi.api.adherent.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * État des deux comptes métier de l'adhérent — Sécurité Sociale et Épargne — sur un seul dossier
 * (correctif COSITI V1 §7 : « un seul compte par adhérent », les deux composantes y sont consultables
 * ensemble). Les totaux sont constatés sur les affectations de paiements validés (jamais recalculés côté
 * client).
 */
public record CompteAdherentDto(
        UUID adherentId,
        BigDecimal totalSecuriteSociale,
        BigDecimal totalEpargne,
        BigDecimal preferenceAllocationSecuriteSociale,
        BigDecimal preferenceAllocationEpargne,
        LocalDate preferenceDatePreference
) {
}
