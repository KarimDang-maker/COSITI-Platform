package cm.cositi.api.droits.dto;

import cm.cositi.api.droits.entite.PeriodeDroits;
import cm.cositi.api.droits.entite.StatutPeriode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PeriodeDroitsDto(
        UUID id,
        UUID adherentId,
        LocalDate dateDebut,
        LocalDate dateFin,
        int joursCouverts,
        BigDecimal montantImpute,
        UUID packId,
        StatutPeriode statut,
        UUID sourceAffectationId
) {
    public static PeriodeDroitsDto depuis(PeriodeDroits p) {
        return new PeriodeDroitsDto(p.getId(), p.getAdherentId(), p.getDateDebut(), p.getDateFin(),
                p.getJoursCouverts(), p.getMontantImpute(), p.getPackId(), p.getStatut(), p.getSourceAffectationId());
    }
}
