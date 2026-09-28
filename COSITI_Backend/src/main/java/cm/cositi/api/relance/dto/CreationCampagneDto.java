package cm.cositi.api.relance.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.Map;

/**
 * Création d'une campagne de relance.
 *
 * <p>{@code critere} est libre : il enregistre les filtres réellement utilisés pour constituer la liste
 * (par exemple {@code joursRetardMin}, {@code zoneId}). Il est conservé tel quel, jamais exécuté.</p>
 */
public record CreationCampagneDto(
        @NotBlank String libelle,
        Map<String, Object> critere,
        LocalDate dateDebut
) {
}
