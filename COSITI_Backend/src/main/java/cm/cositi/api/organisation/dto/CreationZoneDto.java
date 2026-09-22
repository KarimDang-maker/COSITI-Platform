package cm.cositi.api.organisation.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record CreationZoneDto(
        @NotBlank(message = "Le code est obligatoire.") String code,
        @NotBlank(message = "Le libellé est obligatoire.") String libelle,
        @NotBlank(message = "La ville est obligatoire.") String ville,
        @NotBlank(message = "La région est obligatoire.") String region,
        UUID zoneParenteId
) {
}
