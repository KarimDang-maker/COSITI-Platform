package cm.cositi.api.relance.dto;

import cm.cositi.api.relance.entite.CampagneRelance;
import cm.cositi.api.relance.entite.StatutCampagne;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * {@code critereJson} est renvoyé tel qu'il a été enregistré : le serveur ne le réinterprète pas, l'écran
 * l'affiche comme la trace de ce qui a motivé la campagne.
 * {@code nbRelances} compte les contacts rattachés, pour distinguer une campagne travaillée d'une campagne
 * ouverte puis oubliée.
 */
public record CampagneRelanceDto(
        UUID id,
        String libelle,
        String critereJson,
        LocalDate dateDebut,
        LocalDate dateFin,
        StatutCampagne statut,
        long nbRelances,
        Instant creeLe,
        String creePar
) {
    public static CampagneRelanceDto depuis(CampagneRelance c, long nbRelances) {
        return new CampagneRelanceDto(c.getId(), c.getLibelle(), c.getCritere(), c.getDateDebut(), c.getDateFin(),
                c.getStatut(), nbRelances, c.getCreeLe(), c.getCreePar());
    }
}
