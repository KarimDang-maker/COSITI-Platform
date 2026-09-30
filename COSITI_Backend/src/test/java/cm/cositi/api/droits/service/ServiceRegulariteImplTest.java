package cm.cositi.api.droits.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.service.ServiceAdherent;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.repository.RoleRepository;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * docs/02_CLASSES_ET_METHODES.md §5 — le seuil de bascule en retard vient toujours de {@code DELAI_RETARD_JOURS}
 * (jamais 30 codé en dur, contrairement au prototype existant). Complété par {@code DroitsIntegrationTest}
 * (bascule réelle via l'API, aux bornes exactes du seuil).
 */
@ExtendWith(MockitoExtension.class)
class ServiceRegulariteImplTest {

    @Mock
    private AdherentRepository adherentRepository;
    @Mock
    private ServiceParametre serviceParametre;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ServiceAdherent serviceAdherent;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private ServiceRegulariteImpl service;
    private UUID adherentId;
    private Adherent adherent;

    @BeforeEach
    void setUp() throws Exception {
        service = new ServiceRegulariteImpl(adherentRepository, serviceParametre, perimetre, serviceAdherent,
                roleRepository, jdbcTemplate);
        adherentId = UUID.randomUUID();
        adherent = new Adherent("COSITI-00042", "Test Regularite", "677000042", UUID.randomUUID(), UUID.randomUUID(),
                "loc", LocalDate.of(2026, 1, 1));
        Field champId = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
        champId.setAccessible(true);
        champId.set(adherent, adherentId);
        lenient().when(adherentRepository.findById(adherentId)).thenReturn(Optional.of(adherent));
    }

    private void simulerCouvertJusquAu(LocalDate date) {
        when(jdbcTemplate.query(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.<org.springframework.jdbc.core.ResultSetExtractor<LocalDate>>any(),
                eq(adherentId)))
                .thenReturn(date);
    }

    @Test
    void jamaisCotiseQuandAucunePeriodeNExiste() {
        simulerCouvertJusquAu(null);

        assertThat(service.evaluer(adherentId, LocalDate.of(2026, 6, 1))).isEqualTo(StatutRegularite.JAMAIS_COTISE);
    }

    @Test
    void aJourQuandLaDateDeReferenceEstCouverte() {
        simulerCouvertJusquAu(LocalDate.of(2026, 6, 10));

        assertThat(service.evaluer(adherentId, LocalDate.of(2026, 6, 5))).isEqualTo(StatutRegularite.A_JOUR);
        assertThat(service.evaluer(adherentId, LocalDate.of(2026, 6, 10))).isEqualTo(StatutRegularite.A_JOUR);
    }

    @Test
    void bascculeExactementAuSeuilDelaiRetardJoursConfigureParParametre() {
        simulerCouvertJusquAu(LocalDate.of(2026, 6, 1));
        when(serviceParametre.entier("DELAI_RETARD_JOURS")).thenReturn(10);

        // Retard de 10 jours == seuil : encore PARTIELLEMENT_A_JOUR (limite incluse).
        assertThat(service.evaluer(adherentId, LocalDate.of(2026, 6, 11))).isEqualTo(StatutRegularite.PARTIELLEMENT_A_JOUR);
        // Retard de 11 jours > seuil : EN_RETARD.
        assertThat(service.evaluer(adherentId, LocalDate.of(2026, 6, 12))).isEqualTo(StatutRegularite.EN_RETARD);
    }

    @Test
    void evaluerLeveUneExceptionSiAdherentIntrouvable() {
        when(adherentRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.evaluer(UUID.randomUUID(), LocalDate.now()))
                .isInstanceOf(ExceptionRessourceIntrouvable.class);
    }
}
