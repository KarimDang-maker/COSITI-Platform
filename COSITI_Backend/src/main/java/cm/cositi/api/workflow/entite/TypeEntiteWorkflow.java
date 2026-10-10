package cm.cositi.api.workflow.entite;

/** Entités couvertes par le workflow (§2) et permission de lecture qui conditionne la visibilité d'une demande. */
public enum TypeEntiteWorkflow {
    ADHERENT("ADHERENT:LIRE"),
    AGENT("ORGANISATION:LIRE"),
    PAIEMENT("PAIEMENT:LIRE");

    private final String permissionLecture;

    TypeEntiteWorkflow(String permissionLecture) {
        this.permissionLecture = permissionLecture;
    }

    public String permissionLecture() {
        return permissionLecture;
    }
}
