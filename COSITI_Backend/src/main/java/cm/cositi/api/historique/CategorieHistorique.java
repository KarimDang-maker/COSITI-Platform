package cm.cositi.api.historique;

/** Les deux historiques distincts du dossier adhérent (règles module 3 §3). */
public enum CategorieHistorique {
    /** Actions administratives et opérationnelles : identité, coordonnées, documents, CNPS, statut, validation… */
    GENERAL,
    /** Opérations financières : frais d'adhésion, cotisations, répartitions, validations, rejets, corrections, droits. */
    FINANCIER
}
