package cm.cositi.api.historique;

import cm.cositi.api.commun.exception.ExceptionValidation;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;

/**
 * Filtre temporel de l'historique (règles module 3 §2, prompt §15) : jour, semaine, mois, année, ou période
 * personnalisée. Calculé côté serveur, dans le fuseau de la coopérative, en bornes semi-ouvertes
 * {@code [debut, fin[} — l'instant de fin n'appartient jamais à la période, ce qui évite qu'un événement à minuit
 * pile soit compté dans deux périodes consécutives.
 */
public enum PeriodeHistorique {
    JOUR,
    /** Semaine ISO : du lundi au dimanche. */
    SEMAINE,
    MOIS,
    ANNEE;

    /** Fenêtre {@code [debut, fin[} ; une borne nulle = non bornée de ce côté. */
    public record Fenetre(Instant debut, Instant fin) {
        public static final Fenetre TOUT = new Fenetre(null, null);
    }

    /**
     * @param periode   jour / semaine / mois / année contenant {@code reference} (aujourd'hui par défaut)
     * @param du        début inclus d'une période personnalisée
     * @param au        fin INCLUSE d'une période personnalisée (convertie en lendemain 00:00 exclu)
     */
    public static Fenetre fenetre(PeriodeHistorique periode, LocalDate reference, LocalDate du, LocalDate au,
                                  ZoneId fuseau, LocalDate aujourdhui) {
        if (periode != null && (du != null || au != null)) {
            throw new ExceptionValidation("HISTORIQUE_FILTRE_AMBIGU",
                    "Choisissez une période (jour, semaine, mois, année) OU des dates du / au, pas les deux.", "periode");
        }
        if (periode == null && reference != null) {
            throw new ExceptionValidation("HISTORIQUE_FILTRE_AMBIGU",
                    "Le paramètre « date » s'emploie avec une période (jour, semaine, mois, année).", "date");
        }
        if (periode != null) {
            LocalDate jour = reference != null ? reference : aujourdhui;
            LocalDate debut = switch (periode) {
                case JOUR -> jour;
                case SEMAINE -> jour.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                case MOIS -> jour.withDayOfMonth(1);
                case ANNEE -> jour.withDayOfYear(1);
            };
            LocalDate finExclue = switch (periode) {
                case JOUR -> debut.plusDays(1);
                case SEMAINE -> debut.plusWeeks(1);
                case MOIS -> debut.plusMonths(1);
                case ANNEE -> debut.plusYears(1);
            };
            return new Fenetre(debut.atStartOfDay(fuseau).toInstant(), finExclue.atStartOfDay(fuseau).toInstant());
        }
        if (du != null && au != null && du.isAfter(au)) {
            throw new ExceptionValidation("HISTORIQUE_PERIODE_INVALIDE",
                    "La date de début doit précéder ou égaler la date de fin.", "du");
        }
        return new Fenetre(du == null ? null : du.atStartOfDay(fuseau).toInstant(),
                au == null ? null : au.plusDays(1).atStartOfDay(fuseau).toInstant());
    }
}
