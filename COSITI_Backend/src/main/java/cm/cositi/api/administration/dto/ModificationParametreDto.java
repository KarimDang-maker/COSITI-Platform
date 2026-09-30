package cm.cositi.api.administration.dto;

import jakarta.validation.constraints.NotBlank;

/** Modification d'une règle paramétrable. Motif obligatoire : une règle métier ne change jamais sans raison. */
public record ModificationParametreDto(@NotBlank String valeur, @NotBlank String motif) {
}
