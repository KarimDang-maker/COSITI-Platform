package cm.cositi.api.cotisation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Rejet définitif d'un paiement par un validateur (#17) — motif obligatoire. */
public record RejeterPaiementDto(
        @NotBlank(message = "Le motif du rejet est obligatoire.")
        @Size(max = 1000, message = "Le motif ne peut pas dépasser 1000 caractères.") String motif
) {
}
