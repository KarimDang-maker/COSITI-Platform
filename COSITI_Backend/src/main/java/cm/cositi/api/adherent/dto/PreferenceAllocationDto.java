package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.entite.PreferenceAllocationAdherent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Préférence d'allocation Sécurité Sociale/Épargne du dossier adhérent (correctif COSITI V1 §8). */
public record PreferenceAllocationDto(
        UUID id,
        UUID adherentId,
        UUID packId,
        BigDecimal montantReference,
        BigDecimal allocationSecuriteSociale,
        BigDecimal allocationEpargne,
        LocalDate datePreference
) {
    public static PreferenceAllocationDto depuis(PreferenceAllocationAdherent p) {
        return new PreferenceAllocationDto(p.getId(), p.getAdherentId(), p.getPackId(), p.getMontantReference(),
                p.getAllocationSecuriteSociale(), p.getAllocationEpargne(), p.getDatePreference());
    }
}
