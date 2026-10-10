package cm.cositi.api.workflow.service;

import cm.cositi.api.workflow.entite.ActionWorkflow;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;

import java.util.List;
import java.util.UUID;

/**
 * Événement de domaine du workflow (§23 : {@code ValidationRequestSubmitted}, {@code …Approved},
 * {@code …Rejected}, {@code ValidationCorrectionRequested}…), distingué par {@link #action()}. Consommé après commit
 * uniquement par {@link EcouteurEvenementsWorkflow}.
 */
public record DemandeValidationEvent(
        UUID demandeId,
        String reference,
        TypeEntiteWorkflow typeEntite,
        UUID entiteId,
        TypeOperationWorkflow typeOperation,
        ActionWorkflow action,
        StatutDemandeValidation statut,
        UUID demandeurId,
        List<String> rolesValidateurs,
        String commentaire
) {
}
