package cm.cositi.api.adhesion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Synthèse des frais d'adhésion enregistrés sur une période (§5 Reporting), calculée par agrégation SQL.
 *
 * @param agentId {@code null} pour la synthèse globale
 */
public record SyntheseFraisAdhesionDto(
        LocalDate du,
        LocalDate au,
        UUID agentId,
        long nombreFrais,
        BigDecimal montantAttendu,
        BigDecimal montantRecu,
        BigDecimal ecart,
        Map<String, Long> nombreParStatut,
        List<LigneJournaliere> parJour
) {
    public record LigneJournaliere(LocalDate date, long nombreFrais, BigDecimal montantAttendu, BigDecimal montantRecu) {
    }
}
