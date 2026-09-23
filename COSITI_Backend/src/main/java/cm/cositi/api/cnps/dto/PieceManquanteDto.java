package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.StatutPieceCnps;
import cm.cositi.api.cnps.entite.TypePieceCnps;

/**
 * Pièce obligatoire non encore fournie (ou rejetée) d'un dossier CNPS.
 * {@code statutActuel} vaut {@code ATTENDUE} si la pièce n'a jamais été déposée, {@code REJETEE} si elle
 * l'a été mais refusée : la distinction change ce que l'utilisateur doit faire.
 */
public record PieceManquanteDto(TypePieceCnps typePiece, StatutPieceCnps statutActuel) {
}
