package cm.cositi.api.document.entite;

/** Nature métier d'un document — colonne {@code document.type_document} (V4__cnps_documents_relances.sql). */
public enum TypeDocument {
    CNI,
    ACTE_NAISSANCE,
    PREUVE_PAIEMENT,
    ACCUSE_CNPS,
    AUTRE;

    /**
     * Pièces d'identité : chiffrées au repos sans condition (docs/04_SECURITE.md §4). Les autres documents le
     * sont aussi dans cette implémentation — le schéma pose {@code chiffre NOT NULL DEFAULT true} — mais ce
     * marqueur existe pour qu'un futur assouplissement ne puisse pas déchiffrer ces deux types par mégarde.
     */
    public boolean estPieceIdentite() {
        return this == CNI || this == ACTE_NAISSANCE;
    }
}
