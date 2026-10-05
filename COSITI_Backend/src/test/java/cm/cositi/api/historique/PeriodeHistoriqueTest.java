package cm.cositi.api.historique;

import cm.cositi.api.commun.exception.ExceptionValidation;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Prompt §15 : bornes calculées côté serveur, dans le fuseau de la coopérative, en [début, fin[. */
class PeriodeHistoriqueTest {

    private static final ZoneId DOUALA = ZoneId.of("Africa/Douala"); // UTC+1, sans heure d'été
    private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 10, 4); // un dimanche

    @Test
    void jourCouvreMinuitAMinuitHeureLocale() {
        var f = PeriodeHistorique.fenetre(PeriodeHistorique.JOUR, LocalDate.of(2026, 10, 2), null, null, DOUALA,
                AUJOURDHUI);

        assertThat(f.debut()).isEqualTo(Instant.parse("2026-10-01T23:00:00Z"));
        assertThat(f.fin()).isEqualTo(Instant.parse("2026-10-02T23:00:00Z"));
    }

    @Test
    void semaineIsoDuLundiAuDimancheInclus() {
        var f = PeriodeHistorique.fenetre(PeriodeHistorique.SEMAINE, null, null, null, DOUALA, AUJOURDHUI);

        assertThat(f.debut()).isEqualTo(LocalDate.of(2026, 9, 28).atStartOfDay(DOUALA).toInstant());
        assertThat(f.fin()).isEqualTo(LocalDate.of(2026, 10, 5).atStartOfDay(DOUALA).toInstant());
    }

    @Test
    void moisEtAnneeCalendaires() {
        var mois = PeriodeHistorique.fenetre(PeriodeHistorique.MOIS, LocalDate.of(2026, 2, 15), null, null, DOUALA,
                AUJOURDHUI);
        var annee = PeriodeHistorique.fenetre(PeriodeHistorique.ANNEE, null, null, null, DOUALA, AUJOURDHUI);

        assertThat(mois.debut()).isEqualTo(LocalDate.of(2026, 2, 1).atStartOfDay(DOUALA).toInstant());
        assertThat(mois.fin()).isEqualTo(LocalDate.of(2026, 3, 1).atStartOfDay(DOUALA).toInstant());
        assertThat(annee.debut()).isEqualTo(LocalDate.of(2026, 1, 1).atStartOfDay(DOUALA).toInstant());
        assertThat(annee.fin()).isEqualTo(LocalDate.of(2027, 1, 1).atStartOfDay(DOUALA).toInstant());
    }

    @Test
    void periodePersonnaliseeInclutLeDernierJour() {
        var f = PeriodeHistorique.fenetre(null, null, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30), DOUALA,
                AUJOURDHUI);

        assertThat(f.fin()).isEqualTo(LocalDate.of(2026, 10, 1).atStartOfDay(DOUALA).toInstant());
    }

    @Test
    void sansFiltreAucuneBorne() {
        assertThat(PeriodeHistorique.fenetre(null, null, null, null, DOUALA, AUJOURDHUI))
                .isEqualTo(PeriodeHistorique.Fenetre.TOUT);
    }

    @Test
    void bornesInverseesOuFiltresMelangesRefuses() {
        assertThatThrownBy(() -> PeriodeHistorique.fenetre(null, null, LocalDate.of(2026, 10, 2),
                LocalDate.of(2026, 10, 1), DOUALA, AUJOURDHUI))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "HISTORIQUE_PERIODE_INVALIDE");
        assertThatThrownBy(() -> PeriodeHistorique.fenetre(PeriodeHistorique.MOIS, null, LocalDate.of(2026, 10, 1),
                null, DOUALA, AUJOURDHUI))
                .hasFieldOrPropertyWithValue("code", "HISTORIQUE_FILTRE_AMBIGU");
    }
}
