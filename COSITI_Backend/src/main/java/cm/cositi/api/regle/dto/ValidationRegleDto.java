package cm.cositi.api.regle.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Confirmation d'une règle : le motif cite la décision COSITI (procès-verbal, note, date). */
public record ValidationRegleDto(
        @NotBlank @Size(max = 500) String motif
) {
}
