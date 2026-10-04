package cm.cositi.api.workflow.entite;

import java.util.List;

/**
 * Politique de validation (§20) : chaque opération porte le module concerné, les permissions qui autorisent à
 * la demander, la permission qui autorise à la valider et, le cas échéant, le rôle fonctionnel exigé (DAF pour
 * la validation financière). Aucune règle « rôle supérieur » : tout se règle par la table {@code role_permission}.
 */
public enum TypeOperationWorkflow {

    /** Soumission d'un dossier adhérent pour le rendre officiel. Pas d'éléments : instantané du dossier. */
    ADHERENT_VALIDATION_DOSSIER(TypeEntiteWorkflow.ADHERENT, List.of("ADHERENT:CREER", "ADHERENT:MODIFIER"),
            "ADHERENT:VALIDER", null, false),
    /** Modification d'une donnée officielle d'un adhérent validé. */
    ADHERENT_MODIFICATION(TypeEntiteWorkflow.ADHERENT, List.of("ADHERENT:MODIFIER"),
            "ADHERENT:VALIDER", null, true),
    AGENT_VALIDATION_PROFIL(TypeEntiteWorkflow.AGENT, List.of("ORGANISATION:GERER"),
            "AGENT:VALIDER", null, false),
    AGENT_MODIFICATION(TypeEntiteWorkflow.AGENT, List.of("ORGANISATION:GERER"),
            "AGENT:VALIDER", null, true),
    AGENT_CHANGEMENT_STATUT(TypeEntiteWorkflow.AGENT, List.of("ORGANISATION:GERER"),
            "AGENT:VALIDER", null, true),
    /** Correction d'une cotisation soumise ou validée : le DAF reste l'acteur de validation financière (§19). */
    PAIEMENT_CORRECTION(TypeEntiteWorkflow.PAIEMENT, List.of("PAIEMENT:CREER", "PAIEMENT:CORRIGER"),
            "PAIEMENT:VALIDER", "DAF", true);

    private final TypeEntiteWorkflow typeEntite;
    private final List<String> permissionsDemande;
    private final String permissionValidation;
    private final String roleValidationRequis;
    private final boolean avecElements;

    TypeOperationWorkflow(TypeEntiteWorkflow typeEntite, List<String> permissionsDemande, String permissionValidation,
                          String roleValidationRequis, boolean avecElements) {
        this.typeEntite = typeEntite;
        this.permissionsDemande = permissionsDemande;
        this.permissionValidation = permissionValidation;
        this.roleValidationRequis = roleValidationRequis;
        this.avecElements = avecElements;
    }

    public TypeEntiteWorkflow typeEntite() {
        return typeEntite;
    }

    public List<String> permissionsDemande() {
        return permissionsDemande;
    }

    public String permissionValidation() {
        return permissionValidation;
    }

    /** Rôle fonctionnel exigé en plus de la permission ({@code null} : la permission suffit). */
    public String roleValidationRequis() {
        return roleValidationRequis;
    }

    /** {@code true} : la demande porte des propositions champ par champ ; {@code false} : instantané du dossier. */
    public boolean avecElements() {
        return avecElements;
    }

    /** Validation d'un dossier ou d'un profil complet, par opposition à la modification d'une donnée officielle. */
    public boolean estValidationInitiale() {
        return this == ADHERENT_VALIDATION_DOSSIER || this == AGENT_VALIDATION_PROFIL;
    }
}
