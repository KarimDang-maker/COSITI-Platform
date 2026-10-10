package cm.cositi.api.adhesion.entite;

/**
 * Statut calculé d'une pièce dans la checklist d'un adhérent (document des règles v2.0, §20). Jamais stocké : il se
 * déduit des documents téléversés, de leur validité et du dernier contrôle DGA.
 */
public enum StatutPiece {
    /** Pièce obligatoire non fournie. */
    REQUIS,
    /** Pièce conditionnelle ou optionnelle non fournie. */
    NON_FOURNI,
    /** Fournie, pas encore contrôlée (ou nouvelle version depuis le dernier contrôle). */
    FOURNI,
    /** Comprise dans un contrôle DGA en cours. */
    EN_VERIFICATION,
    /** Contrôlée et conforme. */
    VALIDE,
    /** Contrôlée : au moins une information ne correspond pas, ou pièce constatée manquante. */
    NON_CONFORME,
    /** Contrôlée : illisible. */
    ILLISIBLE,
    /** Date de fin de validité dépassée. */
    EXPIRE,
    /** Version remplacée par une plus récente (historique). */
    REMPLACE,
    /** Non applicable à cet adhérent. */
    NON_APPLICABLE
}
