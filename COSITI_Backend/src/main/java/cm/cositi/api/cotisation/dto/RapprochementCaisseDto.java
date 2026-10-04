package cm.cositi.api.cotisation.dto;

import cm.cositi.api.cotisation.entite.BilanCaisseJournalier;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Rapprochement de caisse d'une journée (#30 à #33). {@code ecart = montantPhysique - montantNumerique}, figé à la
 * saisie ; {@code montantNumeriqueActuel} est recalculé à la lecture pour signaler un paiement enregistré ou annulé
 * après la saisie ({@code numeriqueModifieDepuisSaisie}).
 */
public record RapprochementCaisseDto(
        UUID id,
        LocalDate date,
        BigDecimal montantNumerique,
        BigDecimal montantPhysique,
        BigDecimal ecart,
        int nombrePaiements,
        String statut,
        String commentaire,
        UUID saisiPar,
        String creePar,
        Instant creeLe,
        UUID validePar,
        Instant valideLe,
        String commentaireValidation,
        String motifAnomalie,
        UUID signalePar,
        Instant signaleLe,
        BigDecimal montantNumeriqueActuel,
        boolean numeriqueModifieDepuisSaisie,
        Long version
) {
    public static RapprochementCaisseDto depuis(BilanCaisseJournalier b, BigDecimal montantNumeriqueActuel) {
        boolean modifie = montantNumeriqueActuel != null
                && montantNumeriqueActuel.compareTo(b.getMontantNumerique()) != 0;
        return new RapprochementCaisseDto(b.getId(), b.getDateBilan(), b.getMontantNumerique(), b.getMontantPhysique(),
                b.getEcart(), b.getNombrePaiements(), b.getStatut().name(), b.getCommentaire(), b.getSaisiPar(),
                b.getCreePar(), b.getCreeLe(), b.getValidePar(), b.getValideLe(), b.getCommentaireValidation(),
                b.getMotifAnomalie(), b.getSignalePar(), b.getSignaleLe(), montantNumeriqueActuel, modifie,
                b.getVersion());
    }
}
