package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.StatutDossierCnps;
import jakarta.validation.constraints.NotNull;

public record ChangementStatutDossierDto(
        @NotNull StatutDossierCnps statut,
        String commentaire
) {
}
