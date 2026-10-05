package cm.cositi.api.cotisation.service;

import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.cotisation.entite.OrigineRepartition;
import cm.cositi.api.parametre.ServiceParametre;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/** Prompt §9 et §21 « tests financiers » : invariant, minimum Sécurité sociale, minimum Épargne, aucun plafond. */
@ExtendWith(MockitoExtension.class)
class RegleRepartitionCotisationTest {

    @Mock
    private ServiceParametre parametres;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private RegleRepartitionCotisation regle;

    @BeforeEach
    void setUp() {
        regle = new RegleRepartitionCotisation(parametres, jdbcTemplate);
        lenient().when(parametres.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(new BigDecimal("700"));
        lenient().when(parametres.decimal("MONTANT_MINIMUM_EPARGNE")).thenReturn(new BigDecimal("300"));
        lenient().when(parametres.booleen("EPARGNE_FACULTATIVE_PAR_COTISATION")).thenReturn(true);
    }

    private static BigDecimal d(String v) {
        return new BigDecimal(v);
    }

    @ParameterizedTest(name = "{0} = {1} + {2} accepté")
    @CsvSource({"1000, 700, 300", "1500, 700, 800", "700, 700, 0", "5000, 4700, 300", "1000000, 700, 999300"})
    void repartitionsValides(String total, String ss, String ep) {
        assertThatCode(() -> regle.valider(d(total), d(ss), d(ep))).doesNotThrowAnyException();
    }

    @ParameterizedTest(name = "{0} = {1} + {2} refusé : {3}")
    @CsvSource({
            "1000, 600, 400, COTISATION_SECURITE_SOCIALE_INSUFFISANTE",
            "900, 700, 200, COTISATION_EPARGNE_INSUFFISANTE",
            "1000, 700, 400, COTISATION_REPARTITION_INCOHERENTE",
            "900, 800, 100, COTISATION_EPARGNE_INSUFFISANTE",
            "500, 500, 0, COTISATION_MONTANT_INSUFFISANT",
            "1000, -100, 1100, COTISATION_REPARTITION_INVALIDE",
            "1000, 700.001, 299.999, COTISATION_REPARTITION_INVALIDE"})
    void repartitionsRefusees(String total, String ss, String ep, String code) {
        assertThatThrownBy(() -> regle.valider(d(total), d(ss), d(ep)))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", code);
    }

    @Test
    void epargneNulleRefuseeQuandLaCotisationDoitToujoursAlimenterLEpargne() {
        when(parametres.booleen("EPARGNE_FACULTATIVE_PAR_COTISATION")).thenReturn(false);

        assertThatThrownBy(() -> regle.valider(d("700"), d("700"), d("0")))
                .hasFieldOrPropertyWithValue("code", "COTISATION_EPARGNE_INSUFFISANTE");
    }

    @Test
    void lesSeuilsViennentDesParametresJamaisDUneConstante() {
        when(parametres.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(new BigDecimal("1000"));

        assertThatThrownBy(() -> regle.valider(d("1000"), d("700"), d("300")))
                .hasFieldOrPropertyWithValue("code", "COTISATION_SECURITE_SOCIALE_INSUFFISANTE");
    }

    @Test
    void saisieDUnSeulDesDeuxMontantsRefusee() {
        assertThatThrownBy(() -> regle.determiner(d("1000"), d("700"), null, UUID.randomUUID()))
                .hasFieldOrPropertyWithValue("code", "COTISATION_REPARTITION_INCOMPLETE");
    }

    @Test
    void sansSaisieLaPreferenceDeLAdherentPrimeSurLaRegleParDefaut() {
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(), any())).thenReturn(List.of(
                new RegleRepartitionCotisation.Repartition(d("1000"), d("500"), OrigineRepartition.PROPOSITION_SERVEUR)));

        var r = regle.determiner(d("1500"), null, null, UUID.randomUUID());

        assertThat(r.securiteSociale()).isEqualByComparingTo("1000");
        assertThat(r.epargne()).isEqualByComparingTo("500");
        assertThat(r.origine()).isEqualTo(OrigineRepartition.PROPOSITION_SERVEUR);
    }

    @Test
    void sansSaisieNiPreferenceSeptCentsPuisLeResteALEpargne() {
        var r = regle.determiner(d("1000"), null, null, UUID.randomUUID());

        assertThat(r.securiteSociale()).isEqualByComparingTo("700");
        assertThat(r.epargne()).isEqualByComparingTo("300");
    }

    @Test
    void uneSaisieValideEstConserveeTelleQuelle() {
        var r = regle.determiner(d("1500"), d("700"), d("800"), UUID.randomUUID());

        assertThat(r.origine()).isEqualTo(OrigineRepartition.SAISIE);
        assertThat(r.epargne()).isEqualByComparingTo("800");
    }

    @Test
    void lesSeuilsExposesSignalentLAbsenceDePlafond() {
        var seuils = regle.seuils();

        assertThat(seuils.minimumSecuriteSociale()).isEqualByComparingTo("700");
        assertThat(seuils.minimumEpargne()).isEqualByComparingTo("300");
        assertThat(seuils.avertissements()).anyMatch(a -> a.contains("Aucun plafond"));
    }
}
