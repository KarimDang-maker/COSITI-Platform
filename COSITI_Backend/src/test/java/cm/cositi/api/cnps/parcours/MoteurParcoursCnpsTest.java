package cm.cositi.api.cnps.parcours;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class MoteurParcoursCnpsTest {

    private static final ParametresParcours P = new ParametresParcours(new BigDecimal("10500"),
            new BigDecimal("21000"), 15, 30);

    private static SituationParcours eval(String cumul, String persiste, int reports, LocalDate limite,
                                          boolean immat, LocalDate jour) {
        return MoteurParcoursCnps.evaluer(new BigDecimal(cumul), persiste, reports, limite, immat, P, jour);
    }

    @Test
    void quotaAtteintLeDernierJourDeLaPremiereFenetreEstEligible() {
        SituationParcours s = eval("10500", null, 0, null, false, LocalDate.of(2026, 10, 14));
        assertThat(s.etape()).isEqualTo(EtapeParcours.ELIGIBLE_PREIMMAT);
        assertThat(s.fenetre()).isEqualTo(FenetrePreimmat.FENETRE_1);
        assertThat(s.enRetard()).isFalse();
    }

    @Test
    void sousLeQuotaLaPremiereFenetreNEstPasEncoreUnRetard() {
        SituationParcours s = eval("10499", null, 0, null, false, LocalDate.of(2026, 10, 14));
        assertThat(s.etape()).isEqualTo(EtapeParcours.NON_ELIGIBLE);
        assertThat(s.enRetard()).isFalse();
        assertThat(s.resteAvantPreimmat()).isEqualByComparingTo("1");
    }

    @Test
    void lePremierJourDeLaSecondeFenetreUnNonEligibleEstEnRetard() {
        SituationParcours s = eval("5000", null, 0, null, false, LocalDate.of(2026, 10, 15));
        assertThat(s.fenetre()).isEqualTo(FenetrePreimmat.FENETRE_2);
        assertThat(s.enRetard()).isTrue();
        assertThat(s.reporte()).isFalse();
    }

    @Test
    void unAdherentReporteresteEnRetardMemeEnPremiereFenetre() {
        SituationParcours s = eval("5000", null, 1, null, false, LocalDate.of(2026, 11, 2));
        assertThat(s.enRetard()).isTrue();
        assertThat(s.reporte()).isTrue();
    }

    @Test
    void lePasDeCoupureEstCeluiDuParametre() {
        ParametresParcours p20 = new ParametresParcours(P.quotaPreimmat(), P.quotaImmat(), 20, 30);
        assertThat(MoteurParcoursCnps.fenetre(LocalDate.of(2026, 10, 19), p20.jourCoupure()))
                .isEqualTo(FenetrePreimmat.FENETRE_1);
        assertThat(MoteurParcoursCnps.fenetre(LocalDate.of(2026, 10, 20), p20.jourCoupure()))
                .isEqualTo(FenetrePreimmat.FENETRE_2);
    }

    @Test
    void preimmatriculeAvecDelaiRestantEtDelaiDepasse() {
        LocalDate limite = LocalDate.of(2026, 10, 20);
        SituationParcours ok = eval("12000", "PREIMMATRICULE", 0, limite, false, LocalDate.of(2026, 10, 17));
        assertThat(ok.etape()).isEqualTo(EtapeParcours.PREIMMATRICULE);
        assertThat(ok.joursRestantsDepot()).isEqualTo(3);
        assertThat(ok.horsDelaiDepot()).isFalse();

        SituationParcours ko = eval("12000", "PREIMMATRICULE", 0, limite, false, LocalDate.of(2026, 10, 21));
        assertThat(ko.joursRestantsDepot()).isEqualTo(-1);
        assertThat(ko.horsDelaiDepot()).isTrue();
    }

    @Test
    void lImmatriculationDemandeLeQuotaDe21000() {
        assertThat(eval("20999", "DOSSIER_DEPOSE", 0, null, false, LocalDate.of(2026, 10, 20)).eligibleImmat())
                .isFalse();
        SituationParcours s = eval("21000", "DOSSIER_DEPOSE", 0, null, false, LocalDate.of(2026, 10, 20));
        assertThat(s.eligibleImmat()).isTrue();
        assertThat(s.resteAvantImmat()).isEqualByComparingTo("0");
    }

    @Test
    void unNumeroCnpsDejaConnuMetLAdherentALEtapeImmatricule() {
        SituationParcours s = eval("0", null, 0, null, true, LocalDate.of(2026, 10, 20));
        assertThat(s.etape()).isEqualTo(EtapeParcours.IMMATRICULE);
        assertThat(s.eligibleImmat()).isFalse();
    }

    @Test
    void relever_le_quota_ne_fait_pas_revenir_en_arriere_un_preimmatricule() {
        ParametresParcours releve = new ParametresParcours(new BigDecimal("50000"), new BigDecimal("90000"), 15, 30);
        SituationParcours s = MoteurParcoursCnps.evaluer(new BigDecimal("11000"), "PREIMMATRICULE", 0,
                LocalDate.of(2026, 11, 1), false, releve, LocalDate.of(2026, 10, 20));
        assertThat(s.etape()).isEqualTo(EtapeParcours.PREIMMATRICULE);
    }
}
