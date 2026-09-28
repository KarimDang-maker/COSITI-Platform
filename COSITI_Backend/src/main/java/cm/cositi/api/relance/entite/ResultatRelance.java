package cm.cositi.api.relance.entite;

/** Contrainte CHECK de {@code relance.resultat} (V4). */
public enum ResultatRelance {
    PROMESSE,
    PAIEMENT,
    INJOIGNABLE,
    REFUS,
    DEMENAGE,
    ABSENT;

    /**
     * {@code true} si le résultat appelle un nouveau contact. Sert uniquement à exiger une date de
     * prochaine action à la saisie — jamais à planifier automatiquement quoi que ce soit : aucune règle de
     * relance automatique n'est validée par la COSITI.
     */
    public boolean appelleUnSuivi() {
        return this == PROMESSE || this == INJOIGNABLE || this == ABSENT;
    }
}
