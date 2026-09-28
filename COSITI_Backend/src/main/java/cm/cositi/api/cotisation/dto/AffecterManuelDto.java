package cm.cositi.api.cotisation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record AffecterManuelDto(
        @NotEmpty(message = "Au moins une ligne d'affectation est requise.") @Valid List<LigneAffectationDto> lignes
) {
}
