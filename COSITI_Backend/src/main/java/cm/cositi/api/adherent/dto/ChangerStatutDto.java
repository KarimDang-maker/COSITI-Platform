package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.entite.StatutAdherent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ChangerStatutDto(
        @NotNull(message = "Le nouveau statut est obligatoire.") StatutAdherent statut,
        @NotBlank(message = "Le motif est obligatoire.") String motif
) {
}
