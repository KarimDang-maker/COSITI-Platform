package cm.cositi.api.cotisation.entite;

public enum StatutPaiement {
    BROUILLON,
    A_CONTROLER,
    VALIDE,
    RAPPROCHE,
    ANNULE,
    INCOHERENCE,
    /** Rejet définitif et motivé par un validateur (#17, V18) — distinct de l'annulation. */
    REJETE
}
