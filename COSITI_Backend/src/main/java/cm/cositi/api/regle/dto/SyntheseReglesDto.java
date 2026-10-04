package cm.cositi.api.regle.dto;

import java.util.List;

/** Inventaire des règles provisoires, par statut — tableau de bord de la validation COSITI. */
public record SyntheseReglesDto(
        long parametresNonValides,
        long parametresProposes,
        long exigencesNonConfirmees,
        List<RegleEnAttenteDto> regles
) {
}
