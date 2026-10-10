package cm.cositi.api.cnps.entite;

/**
 * Types de pièces d'un dossier CNPS — valeurs du commentaire de {@code piece_dossier_cnps.type_piece}
 * (V4__cnps_documents_relances.sql).
 *
 * <p>Lesquelles sont <b>obligatoires</b> ne se décide pas ici : c'est une règle CNPS, portée par le
 * paramètre {@code PIECES_CNPS_OBLIGATOIRES} (statut {@code [V]}, V9), lu par
 * {@code ServiceDossierCnpsImpl}.</p>
 */
public enum TypePieceCnps {
    CNI_RECTO,
    CNI_VERSO,
    ACTE_NAISSANCE,
    PHOTO_IDENTITE,
    FORMULAIRE_SIGNE
}
