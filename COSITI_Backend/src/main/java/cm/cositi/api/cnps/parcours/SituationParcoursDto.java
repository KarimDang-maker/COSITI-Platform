package cm.cositi.api.cnps.parcours;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Une ligne des tableaux de la gestionnaire : où en est un adhérent dans le parcours CNPS. */
public record SituationParcoursDto(
        UUID adherentId,
        String matricule,
        String nomComplet,
        UUID zoneId,
        BigDecimal cumulCotise,
        EtapeParcours etape,
        FenetrePreimmat fenetre,
        boolean enRetard,
        boolean reporte,
        int nbReports,
        LocalDate vagueMois,
        boolean horsDelaiDepot,
        Integer joursRestantsDepot,
        boolean eligibleImmat,
        BigDecimal resteAvantPreimmat,
        BigDecimal resteAvantImmat,
        LocalDate datePreimmatriculation,
        String numeroTemporaire,
        LocalDate dateLimiteDepot,
        LocalDate dateDepotCps,
        boolean depotHorsDelai,
        String cps,
        String numeroImmatriculation,
        LocalDate dateImmatriculation,
        UUID dossierId,
        /** Pièces bloquantes de la checklist d'archivage pas encore vérifiées ni archivées. */
        int piecesManquantes,
        int piecesBloquantes) {
}
