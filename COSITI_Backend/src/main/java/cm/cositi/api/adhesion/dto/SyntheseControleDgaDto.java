package cm.cositi.api.adhesion.dto;

import java.time.LocalDate;
import java.util.Map;

/**
 * Synthèse du contrôle DGA sur une période (§5 {@code getDgaSubmissionSummary} / {@code getDgaVerificationSummary}).
 *
 * @param dossiersDistinctsSoumis adhérents distincts transmis pour la première fois sur la période (sans double comptage)
 * @param parStatutControle       adhérents par état de contrôle courant
 */
public record SyntheseControleDgaDto(
        LocalDate du,
        LocalDate au,
        long dossiersDistinctsSoumis,
        long resoumissions,
        Map<String, Long> parStatutControle,
        long champsEnAnomalie
) {
}
