package cm.cositi.api.reporting.dto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Filtres communs aux six tableaux de bord. Tous facultatifs : sans période, le dashboard porte sur le mois
 * civil en cours, qui est l'horizon de pilotage réel de la coopérative.
 */
public record CritereTableauBord(LocalDate du, LocalDate au, UUID zoneId) {

    public LocalDate debutEffectif() {
        return du != null ? du : LocalDate.now().withDayOfMonth(1);
    }

    public LocalDate finEffective() {
        return au != null ? au : LocalDate.now();
    }
}
