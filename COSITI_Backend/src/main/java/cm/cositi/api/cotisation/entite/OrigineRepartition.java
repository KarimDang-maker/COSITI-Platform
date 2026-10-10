package cm.cositi.api.cotisation.entite;

/** D'où vient la répartition Sécurité sociale / Épargne enregistrée avec une cotisation (V22). */
public enum OrigineRepartition {
    /** Répartie par le Gestionnaire à l'enregistrement (règles module 2 §2). */
    SAISIE,
    /** Aucune répartition fournie : préférence de l'adhérent, sinon règle par défaut, appliquée par le serveur. */
    PROPOSITION_SERVEUR,
    /** Cotisation antérieure à V22 : répartition reprise de ses affectations existantes. */
    REPRISE_AFFECTATIONS
}
