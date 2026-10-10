package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.DossierCnps;
import cm.cositi.api.cnps.entite.StatutDossierCnps;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Dossier CNPS et ses pièces.
 *
 * <p>{@code avertissements} porte les règles non validées rencontrées pendant le traitement — au premier
 * chef l'assiette {@code [V]} lorsque {@code revenuMensuelDeclare} est absent. Le champ n'est jamais vide
 * par confort d'affichage : s'il est vide, c'est qu'aucune règle en attente n'a joué.</p>
 */
public record DossierCnpsDto(
        UUID id,
        UUID adherentId,
        String numeroImmatriculation,
        LocalDate dateImmatriculation,
        BigDecimal revenuMensuelDeclare,
        StatutDossierCnps statut,
        String motifRejet,
        List<PieceDossierCnpsDto> pieces,
        List<PieceManquanteDto> piecesManquantes,
        Instant creeLe,
        String creePar,
        List<String> avertissements
) {
    public static DossierCnpsDto depuis(DossierCnps d, List<PieceDossierCnpsDto> pieces,
                                         List<PieceManquanteDto> manquantes, List<String> avertissements) {
        return new DossierCnpsDto(d.getId(), d.getAdherentId(), d.getNumeroImmatriculation(),
                d.getDateImmatriculation(), d.getRevenuMensuelDeclare(), d.getStatut(), d.getMotifRejet(),
                pieces, manquantes, d.getCreeLe(), d.getCreePar(), avertissements);
    }
}
