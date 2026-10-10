package cm.cositi.api.organisation.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.UUID;

/** #5 — modification du profil d'un agent (réservée DGA, même garde que la création). */
public record ModificationAgentDto(
        @NotBlank(message = "Le nom complet est obligatoire.") String nomComplet,
        @NotBlank(message = "Le téléphone est obligatoire.") String telephone,
        UUID zoneId,
        BigDecimal objectifCollecteMensuel
) {
}
