package cm.cositi.api.avantage;

import cm.cositi.api.avantage.MoteurAvantages.AyantDroit;
import cm.cositi.api.avantage.MoteurAvantages.Contexte;
import cm.cositi.api.avantage.MoteurAvantages.Critere;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class MoteurAvantagesTest {

    private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 10, 8);

    private static Contexte ctx(boolean immat, boolean couvert, LocalDate naissance, List<AyantDroit> ayants) {
        return new Contexte(UUID.randomUUID(), "ACTIF", LocalDate.of(2026, 1, 15), naissance, "PACK_700",
                new BigDecimal("12000"), immat, immat, couvert, false, ayants);
    }

    private static boolean ok(TypeCritere type, String valeur, Contexte c) {
        return MoteurAvantages.evaluer(new Critere(type, valeur), c, AUJOURDHUI).satisfait();
    }

    @Test
    void immatriculeEtDroitsCouverts() {
        Contexte c = ctx(true, true, LocalDate.of(1990, 1, 1), List.of());
        assertThat(ok(TypeCritere.IMMATRICULE, null, c)).isTrue();
        assertThat(ok(TypeCritere.DROITS_COUVERTS, null, c)).isTrue();
        Contexte non = ctx(false, false, LocalDate.of(1990, 1, 1), List.of());
        assertThat(ok(TypeCritere.IMMATRICULE, null, non)).isFalse();
        assertThat(ok(TypeCritere.DROITS_COUVERTS, null, non)).isFalse();
    }

    @Test
    void ageMinimumSeCalculeEnAnneesRevolues() {
        // 60 ans révolus le 8 octobre 2026 pour une naissance le 8 octobre 1966, pas la veille.
        assertThat(ok(TypeCritere.AGE_MIN, "60", ctx(true, true, LocalDate.of(1966, 10, 8), List.of()))).isTrue();
        assertThat(ok(TypeCritere.AGE_MIN, "60", ctx(true, true, LocalDate.of(1966, 10, 9), List.of()))).isFalse();
        assertThat(ok(TypeCritere.AGE_MIN, "60", ctx(true, true, null, List.of()))).isFalse();
    }

    @Test
    void enfantDeMoinsDe21AnsEtTypeDAyantDroit() {
        Contexte c = ctx(true, true, LocalDate.of(1985, 1, 1), List.of(
                new AyantDroit("ENFANT", LocalDate.of(2005, 10, 8)),
                new AyantDroit("CONJOINT", LocalDate.of(1988, 1, 1))));
        assertThat(ok(TypeCritere.ENFANT_AGE_MAX, "21", c)).isTrue();
        assertThat(ok(TypeCritere.ENFANT_AGE_MAX, "20", c)).isFalse();
        assertThat(ok(TypeCritere.AYANT_DROIT, "CONJOINT", c)).isTrue();
        assertThat(ok(TypeCritere.AYANT_DROIT, "conjoint", c)).isTrue();
        // Un conjoint n'est jamais compté comme enfant.
        Contexte sansEnfant = ctx(true, true, LocalDate.of(1985, 1, 1),
                List.of(new AyantDroit("CONJOINT", LocalDate.of(2010, 1, 1))));
        assertThat(ok(TypeCritere.ENFANT_AGE_MAX, "21", sansEnfant)).isFalse();
    }

    @Test
    void cotisationPackStatutEtAnciennete() {
        Contexte c = ctx(false, false, LocalDate.of(1990, 1, 1), List.of());
        assertThat(ok(TypeCritere.COTISATION_MINIMUM, "10500", c)).isTrue();
        assertThat(ok(TypeCritere.COTISATION_MINIMUM, "21000", c)).isFalse();
        assertThat(ok(TypeCritere.PACK, "PACK_700,PACK_1000", c)).isTrue();
        assertThat(ok(TypeCritere.PACK, "PACK_1000", c)).isFalse();
        assertThat(ok(TypeCritere.STATUT_ADHERENT, "ACTIF,REACTIVE", c)).isTrue();
        assertThat(ok(TypeCritere.STATUT_ADHERENT, "RADIE", c)).isFalse();
        assertThat(ok(TypeCritere.ANCIENNETE_MOIS_MIN, "8", c)).isTrue();
        assertThat(ok(TypeCritere.ANCIENNETE_MOIS_MIN, "9", c)).isFalse();
    }

    @Test
    void uneValeurIllisibleNeSatisfaitJamaisLeCritere() {
        Contexte c = ctx(true, true, LocalDate.of(1950, 1, 1), List.of());
        assertThat(ok(TypeCritere.AGE_MIN, "soixante", c)).isFalse();
        assertThat(ok(TypeCritere.COTISATION_MINIMUM, "beaucoup", c)).isFalse();
        assertThat(ok(TypeCritere.AGE_MIN, null, c)).isFalse();
    }

    @Test
    void statutAcquisEnCoursSuspenduEtNonEligible() {
        assertThat(MoteurAvantages.statut(null, 3, 3)).isEqualTo(StatutAvantage.ACQUIS);
        assertThat(MoteurAvantages.statut(null, 1, 3)).isEqualTo(StatutAvantage.EN_COURS);
        assertThat(MoteurAvantages.statut(null, 0, 3)).isEqualTo(StatutAvantage.NON_ELIGIBLE);
        // Un avantage acquis dont un critère tombe est suspendu, il ne retombe pas à « non éligible ».
        assertThat(MoteurAvantages.statut(StatutAvantage.ACQUIS, 1, 3)).isEqualTo(StatutAvantage.SUSPENDU);
        assertThat(MoteurAvantages.statut(StatutAvantage.ACQUIS, 0, 3)).isEqualTo(StatutAvantage.SUSPENDU);
        assertThat(MoteurAvantages.statut(StatutAvantage.SUSPENDU, 2, 3)).isEqualTo(StatutAvantage.SUSPENDU);
        assertThat(MoteurAvantages.statut(StatutAvantage.SUSPENDU, 3, 3)).isEqualTo(StatutAvantage.ACQUIS);
    }

    @Test
    void unAvantageSansCritereNOuvreAucunDroit() {
        assertThat(MoteurAvantages.statut(null, 0, 0)).isEqualTo(StatutAvantage.NON_ELIGIBLE);
        assertThat(MoteurAvantages.statut(StatutAvantage.ACQUIS, 0, 0)).isEqualTo(StatutAvantage.NON_ELIGIBLE);
    }
}
