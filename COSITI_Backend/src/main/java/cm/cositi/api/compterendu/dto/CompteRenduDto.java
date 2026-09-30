package cm.cositi.api.compterendu.dto;

import cm.cositi.api.compterendu.entite.CompteRendu;
import cm.cositi.api.compterendu.entite.StatutCompteRendu;
import cm.cositi.api.compterendu.entite.TypeCompteRendu;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Compte rendu renvoyé par l'API.
 *
 * <p>{@code sourceIds} n'est renseigné que pour un consolidé : c'est la traçabilité exigée par
 * {@code docs/02_CLASSES_ET_METHODES.md §3}, qui permet à la DGA de remonter aux comptes rendus terrain
 * derrière un chiffre.</p>
 */
public record CompteRenduDto(
        UUID id,
        TypeCompteRendu type,
        StatutCompteRendu statut,
        UUID auteurUtilisateurId,
        UUID destinataireUtilisateurId,
        UUID agentId,
        UUID zoneId,
        LocalDate periodeDebut,
        LocalDate periodeFin,
        int nbVisites,
        int nbAdherentsRencontres,
        int nbAdherentsCrees,
        int nbPaiementsEnregistres,
        BigDecimal montantCollecte,
        String synthese,
        String difficultes,
        String observationControle,
        Instant controleLe,
        String controlePar,
        Instant transmisLe,
        List<UUID> sourceIds,
        Instant creeLe,
        String creePar
) {
    public static CompteRenduDto depuis(CompteRendu c, List<UUID> sourceIds) {
        return new CompteRenduDto(c.getId(), c.getType(), c.getStatut(), c.getAuteurUtilisateurId(),
                c.getDestinataireUtilisateurId(), c.getAgentId(), c.getZoneId(), c.getPeriodeDebut(),
                c.getPeriodeFin(), c.getNbVisites(), c.getNbAdherentsRencontres(), c.getNbAdherentsCrees(),
                c.getNbPaiementsEnregistres(), c.getMontantCollecte(), c.getSynthese(), c.getDifficultes(),
                c.getObservationControle(), c.getControleLe(), c.getControlePar(), c.getTransmisLe(),
                sourceIds, c.getCreeLe(), c.getCreePar());
    }

    public static CompteRenduDto depuis(CompteRendu c) {
        return depuis(c, List.of());
    }
}
