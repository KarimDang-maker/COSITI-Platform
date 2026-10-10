package cm.cositi.api.workflow.dto;

import cm.cositi.api.workflow.entite.ActionWorkflow;
import cm.cositi.api.workflow.entite.DecisionDemandeValidation;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;

import java.time.Instant;
import java.util.UUID;

public record DecisionDemandeValidationDto(
        UUID id,
        ActionWorkflow action,
        StatutDemandeValidation statutAvant,
        StatutDemandeValidation statutApres,
        UUID decidePar,
        String decideParIdentifiant,
        Instant decideLe,
        String commentaire
) {
    public static DecisionDemandeValidationDto depuis(DecisionDemandeValidation d) {
        return new DecisionDemandeValidationDto(d.getId(), d.getAction(), d.getStatutAvant(), d.getStatutApres(),
                d.getDecidePar(), d.getDecideParIdentifiant(), d.getDecideLe(), d.getCommentaire());
    }
}
