package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.StatutDossierPrestationCnps;
import jakarta.validation.constraints.NotNull;

public record ChangementStatutDossierPrestationDto(
        @NotNull StatutDossierPrestationCnps statut,
        String commentaire
) {
}
