package cm.cositi.api.adhesion.entite;

/** Cycle d'un frais d'adhésion (V20). */
public enum StatutFraisAdhesion {
    /** Enregistré par le Gestionnaire, encaissement non encore confirmé. */
    ENREGISTRE,
    /** Encaissement confirmé par un autre utilisateur habilité (DAF). */
    VALIDE,
    /** Anomalie signalée : à résoudre avant validation. */
    ANOMALIE
}
