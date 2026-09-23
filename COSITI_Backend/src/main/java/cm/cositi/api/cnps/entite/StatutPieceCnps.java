package cm.cositi.api.cnps.entite;

/** Colonne {@code piece_dossier_cnps.statut} (V4). */
public enum StatutPieceCnps {
    ATTENDUE,
    FOURNIE,
    VALIDEE,
    REJETEE;

    /** Une pièce compte comme présente au dossier dès qu'un document lui est rattaché. */
    public boolean estFournie() {
        return this == FOURNIE || this == VALIDEE;
    }
}
