package cm.cositi.api.cotisation.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** Prompt §12 : reste avant seuil et taux de progression, calculés par le backend. */
class ServiceSyntheseCotisationsTest {

    private static BigDecimal d(String v) {
        return new BigDecimal(v);
    }

    @Test
    void resteAvantSeuil() {
        assertThat(ServiceSyntheseCotisations.resteAvantSeuil(d("36000"), d("10000"))).isEqualByComparingTo("26000");
        assertThat(ServiceSyntheseCotisations.resteAvantSeuil(d("36000"), d("40000"))).isEqualByComparingTo("0");
        assertThat(ServiceSyntheseCotisations.resteAvantSeuil(null, d("40000"))).isNull();
    }

    @Test
    void tauxDeProgressionBorneEtArrondi() {
        assertThat(ServiceSyntheseCotisations.tauxProgression(d("36000"), d("12000"))).isEqualByComparingTo("33.33");
        assertThat(ServiceSyntheseCotisations.tauxProgression(d("36000"), d("0"))).isEqualByComparingTo("0");
        assertThat(ServiceSyntheseCotisations.tauxProgression(d("36000"), d("50000"))).isEqualByComparingTo("100");
        assertThat(ServiceSyntheseCotisations.tauxProgression(null, d("1000"))).isNull();
        assertThat(ServiceSyntheseCotisations.tauxProgression(d("0"), d("1000"))).isNull();
    }
}
