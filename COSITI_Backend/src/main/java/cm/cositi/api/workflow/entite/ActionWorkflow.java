package cm.cositi.api.workflow.entite;

/** Transition enregistrée dans {@code demande_validation_decision} (§6.4). */
public enum ActionWorkflow {
    CREATION,
    SOUMISSION,
    RESOUMISSION,
    APPROBATION,
    REJET,
    DEMANDE_CORRECTION,
    ANNULATION
}
