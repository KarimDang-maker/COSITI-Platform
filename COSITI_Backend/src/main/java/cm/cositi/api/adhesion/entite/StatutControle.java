package cm.cositi.api.adhesion.entite;

/** Statut d'un tour de contrôle documentaire DGA (table {@code controle_dga}, V20). */
public enum StatutControle {
    EN_ATTENTE,
    EN_COURS,
    CORRECTION_DEMANDEE,
    VALIDE,
    REJETE;

    public boolean estOuvert() {
        return this == EN_ATTENTE || this == EN_COURS;
    }
}
