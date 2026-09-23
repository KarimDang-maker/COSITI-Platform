package cm.cositi.api.daf.dto;

import cm.cositi.api.daf.entite.RapportDaf;
import cm.cositi.api.daf.entite.StatutRapportDaf;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Rapport financier renvoyé par l'API.
 *
 * <p>{@code contenuJson} est renvoyé tel qu'il a été figé à la production : le serveur ne le recalcule
 * pas, l'écran l'affiche tel quel.</p>
 */
public record RapportDafDto(
        UUID id,
        String titre,
        StatutRapportDaf statut,
        LocalDate periodeDebut,
        LocalDate periodeFin,
        BigDecimal montantValide,
        BigDecimal montantAControler,
        int nbPaiementsValides,
        int nbIncoherences,
        String contenuJson,
        String commentaire,
        Instant produitLe,
        String produitPar,
        Instant transmisLe,
        String transmisPar
) {
    public static RapportDafDto depuis(RapportDaf r) {
        return new RapportDafDto(r.getId(), r.getTitre(), r.getStatut(), r.getPeriodeDebut(), r.getPeriodeFin(),
                r.getMontantValide(), r.getMontantAControler(), r.getNbPaiementsValides(), r.getNbIncoherences(),
                r.getContenu(), r.getCommentaire(), r.getProduitLe(), r.getProduitPar(), r.getTransmisLe(),
                r.getTransmisPar());
    }
}
