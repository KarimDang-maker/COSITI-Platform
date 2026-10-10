package cm.cositi.api.compterendu.dto;

import jakarta.validation.constraints.NotEmpty;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Consolidation de plusieurs comptes rendus terrain en un compte rendu destiné à la DGA (UC-GC-14).
 *
 * <p>La période du consolidé n'est pas saisie : elle est déduite des sources (du plus tôt au plus tard),
 * pour qu'elle ne puisse pas contredire ce qu'elle agrège.</p>
 */
public record ConsolidationDto(
        @NotEmpty List<UUID> compteRenduIds,
        String synthese,
        LocalDate periodeDebut,
        LocalDate periodeFin
) {
}
