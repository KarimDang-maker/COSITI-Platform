package cm.cositi.api.cnps.parcours;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record DepotDossierDto(LocalDate dateDepot, @NotBlank @Size(max = 120) String cps) {
}
