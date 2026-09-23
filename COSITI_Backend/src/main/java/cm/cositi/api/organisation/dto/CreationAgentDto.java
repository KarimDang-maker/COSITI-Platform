package cm.cositi.api.organisation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreationAgentDto(
        @NotBlank(message = "L'identifiant de connexion est obligatoire.") String identifiantConnexion,
        @NotBlank(message = "Le nom complet est obligatoire.") String nomComplet,
        @NotBlank(message = "Le téléphone est obligatoire.") String telephone,
        @NotNull(message = "La zone est obligatoire.") UUID zoneId,
        BigDecimal objectifCollecteMensuel
) {
}
