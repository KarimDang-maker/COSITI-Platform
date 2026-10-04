package cm.cositi.api.adhesion.entite;

/** Résultat de la comparaison d'une information COSITI avec le document physique (§4.3). */
public enum StatutCorrespondance {
    CORRESPOND,
    NON_CORRESPOND,
    NON_VERIFIABLE,
    NON_LISIBLE,
    DOCUMENT_MANQUANT,
    /** L'information ne s'applique pas à cet adhérent (document des règles v2.0, §14) — ni anomalie, ni motif exigé. */
    NON_APPLICABLE;

    /** Anomalie documentaire : bloque la validation finale tant qu'elle n'est pas traitée (§14). */
    public boolean estAnomalie() {
        return this == NON_CORRESPOND || this == NON_LISIBLE || this == DOCUMENT_MANQUANT;
    }

    /** §14 : commentaire obligatoire pour NON_CORRESPOND, NON_VERIFIABLE, DOCUMENT_MANQUANT, NON_LISIBLE. */
    public boolean exigeCommentaire() {
        return this != CORRESPOND && this != NON_APPLICABLE;
    }
}
