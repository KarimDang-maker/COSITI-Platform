package cm.cositi.api.workflow.entite;

/**
 * Statut de validation d'un dossier adhérent ou d'un profil d'agent (colonne {@code statut_validation}, V19).
 * Il dit si la donnée est officielle ; il ne remplace jamais le statut métier (ACTIF, EN_RETARD, actif/inactif…).
 */
public enum StatutValidationEntite {
    /** Saisie en cours : modifiable directement par les utilisateurs habilités. */
    BROUILLON,
    /** Soumis : verrouillé, aucune modification directe. */
    EN_ATTENTE_VALIDATION,
    /** Le validateur demande un complément : modifiable directement, puis resoumission. */
    CORRECTION_DEMANDEE,
    /** Officiel : toute modification des champs protégés passe par une demande de modification. */
    VALIDE,
    /** Refusé : modifiable directement, puis nouvelle soumission. */
    REJETE;

    public boolean modifiableDirectement() {
        return this == BROUILLON || this == CORRECTION_DEMANDEE || this == REJETE;
    }
}
