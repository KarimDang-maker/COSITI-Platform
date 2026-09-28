package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.StatutPieceCnps;

import java.util.UUID;

/** Pièce obligatoire (référentiel de l'offre) non encore fournie ou rejetée d'un dossier de prestation. */
public record PieceManquantePrestationDto(UUID pieceOffreId, String libelle, StatutPieceCnps statutActuel) {
}
