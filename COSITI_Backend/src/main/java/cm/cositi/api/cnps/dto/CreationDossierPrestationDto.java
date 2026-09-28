package cm.cositi.api.cnps.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreationDossierPrestationDto(
        @NotNull(message = "L'adhérent est obligatoire.") UUID adherentId,
        @NotNull(message = "L'offre est obligatoire.") UUID offreId,
        Integer nombrePersonnesACharge
) {
}
