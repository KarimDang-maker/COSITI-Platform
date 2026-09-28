package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.DossierPrestationCnps;
import cm.cositi.api.cnps.entite.StatutDossierPrestationCnps;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record DossierPrestationCnpsDto(
        UUID id,
        UUID adherentId,
        String adherentMatricule,
        String adherentNomComplet,
        String numeroCnps,
        UUID offreId,
        String offreCode,
        String offreLibelle,
        String rubrique,
        StatutDossierPrestationCnps statut,
        Integer nombrePersonnesACharge,
        LocalDate dateDepot,
        LocalDate dateTransmissionCnps,
        LocalDate prochaineRelanceLe,
        String observations,
        String motifRejet,
        List<PieceDossierPrestationCnpsDto> pieces,
        List<PieceManquantePrestationDto> piecesManquantes,
        Instant creeLe,
        String creePar
) {
    public static DossierPrestationCnpsDto depuis(DossierPrestationCnps d, String adherentMatricule,
                                                    String adherentNomComplet, String numeroCnps, String offreCode,
                                                    String offreLibelle, String rubrique,
                                                    List<PieceDossierPrestationCnpsDto> pieces,
                                                    List<PieceManquantePrestationDto> manquantes) {
        return new DossierPrestationCnpsDto(d.getId(), d.getAdherentId(), adherentMatricule, adherentNomComplet,
                numeroCnps, d.getOffreId(), offreCode, offreLibelle, rubrique, d.getStatut(),
                d.getNombrePersonnesACharge(), d.getDateDepot(), d.getDateTransmissionCnps(),
                d.getProchaineRelanceLe(), d.getObservations(), d.getMotifRejet(), pieces, manquantes, d.getCreeLe(),
                d.getCreePar());
    }
}
