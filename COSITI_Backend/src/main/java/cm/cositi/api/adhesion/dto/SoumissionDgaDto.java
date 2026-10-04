package cm.cositi.api.adhesion.dto;

import jakarta.validation.constraints.Size;

/** Transmission (ou retransmission après correction) au contrôle DGA. Corps facultatif. */
public record SoumissionDgaDto(
        @Size(max = 1000, message = "Le commentaire ne peut pas dépasser 1000 caractères.") String commentaire
) {
}
