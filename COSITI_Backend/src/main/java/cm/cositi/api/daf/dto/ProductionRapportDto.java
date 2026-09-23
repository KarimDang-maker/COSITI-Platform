package cm.cositi.api.daf.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Demande de production d'un rapport financier (UC-DAF-09).
 *
 * <p>Aucun chiffre n'est fourni par l'appelant : ils sont constatés par le serveur sur la période, puis
 * figés dans le rapport. Un rapport dont les montants viendraient du client ne prouverait rien.</p>
 */
public record ProductionRapportDto(
        @NotBlank String titre,
        @NotNull LocalDate periodeDebut,
        @NotNull LocalDate periodeFin,
        String commentaire
) {
}
