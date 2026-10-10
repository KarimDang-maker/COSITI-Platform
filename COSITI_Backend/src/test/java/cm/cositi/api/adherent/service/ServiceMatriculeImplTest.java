package cm.cositi.api.adherent.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceMatriculeImplTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private ServiceMatriculeImpl service;

    @Test
    void genererProchainUtiliseLaSequencePostgresEtFormatteSurCinqChiffres() {
        when(jdbcTemplate.queryForObject("SELECT nextval('seq_matricule_adherent')", Long.class)).thenReturn(42L);

        assertThat(service.genererProchain()).isEqualTo("COSITI-00042");
    }

    @Test
    void genererProchainNeTronquePasAuDelaDeCinqChiffres() {
        when(jdbcTemplate.queryForObject("SELECT nextval('seq_matricule_adherent')", Long.class)).thenReturn(123456L);

        assertThat(service.genererProchain()).isEqualTo("COSITI-123456");
    }

    @Test
    void estValideAccepteLeFormatAttendu() {
        assertThat(service.estValide("COSITI-00042")).isTrue();
        assertThat(service.estValide("COSITI-123456")).isTrue();
    }

    @Test
    void estValideRefuseUnFormatIncorrect() {
        assertThat(service.estValide("COSITI-42")).isFalse();
        assertThat(service.estValide("00042")).isFalse();
        assertThat(service.estValide(null)).isFalse();
    }
}
