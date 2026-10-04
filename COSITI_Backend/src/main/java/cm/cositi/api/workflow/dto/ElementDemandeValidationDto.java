package cm.cositi.api.workflow.dto;

import cm.cositi.api.workflow.entite.ElementDemandeValidation;
import cm.cositi.api.workflow.entite.TypeDonneeChamp;

import java.util.UUID;

public record ElementDemandeValidationDto(
        UUID id,
        String champ,
        TypeDonneeChamp typeDonnee,
        String ancienneValeur,
        String valeurProposee,
        String motifChangement
) {
    public static ElementDemandeValidationDto depuis(ElementDemandeValidation e) {
        return new ElementDemandeValidationDto(e.getId(), e.getChamp(), e.getTypeDonnee(), e.getAncienneValeur(),
                e.getValeurProposee(), e.getMotifChangement());
    }
}
