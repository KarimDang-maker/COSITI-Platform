package cm.cositi.api.avantage;

/** Situation d'un adhérent vis-à-vis d'un avantage. */
public enum StatutAvantage {
    /** Tous les critères sont remplis : l'adhérent bénéficie de l'avantage. */
    ACQUIS,
    /** Une partie des critères est remplie : l'adhérent s'en approche. */
    EN_COURS,
    /** Aucun critère rempli. */
    NON_ELIGIBLE,
    /** Avantage acquis auparavant mais un critère n'est plus rempli (ex. droits expirés). */
    SUSPENDU
}
