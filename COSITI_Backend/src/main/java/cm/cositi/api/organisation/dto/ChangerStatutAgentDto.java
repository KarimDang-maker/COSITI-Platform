package cm.cositi.api.organisation.dto;

import jakarta.validation.constraints.NotBlank;

/** #6 — activation/désactivation d'un agent. Motif toujours obligatoire, dans les deux sens. */
public record ChangerStatutAgentDto(
        boolean actif,
        @NotBlank(message = "Le motif est obligatoire.") String motif
) {
}
