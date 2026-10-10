package cm.cositi.api.cotisation.entite;

/** Cycle du bilan journalier de caisse (#30 à #33). */
public enum StatutBilanCaisse {
    /** Montant physique saisi, en attente de décision du DAF. */
    SAISI,
    /** Validé par le DAF — définitif. */
    VALIDE,
    /** Anomalie signalée par le DAF — la caisse doit être recomptée et ressaisie. */
    ANOMALIE
}
