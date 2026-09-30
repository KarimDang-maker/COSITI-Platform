package cm.cositi.api.organisation.dto;

import cm.cositi.api.organisation.entite.AffectationPortefeuille;

import java.time.LocalDate;
import java.util.UUID;

/** #24 — une ligne de l'historique de portefeuille d'un agent (ouverte ou clôturée, jamais supprimée). */
public record AffectationPortefeuilleDto(
        UUID adherentId,
        LocalDate dateDebut,
        LocalDate dateFin,
        String motif
) {
    public static AffectationPortefeuilleDto depuis(AffectationPortefeuille a) {
        return new AffectationPortefeuilleDto(a.getAdherentId(), a.getDateDebut(), a.getDateFin(), a.getMotif());
    }
}
