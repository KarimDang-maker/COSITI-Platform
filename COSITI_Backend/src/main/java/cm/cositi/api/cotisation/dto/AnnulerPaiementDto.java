package cm.cositi.api.cotisation.dto;

import jakarta.validation.constraints.NotBlank;

public record AnnulerPaiementDto(@NotBlank(message = "Le motif est obligatoire.") String motif) {
}
