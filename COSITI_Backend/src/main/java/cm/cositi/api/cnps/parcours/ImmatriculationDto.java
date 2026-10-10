package cm.cositi.api.cnps.parcours;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ImmatriculationDto(
        @NotBlank @Size(max = 30) String numeroImmatriculation,
        LocalDate dateImmatriculation) {
}
