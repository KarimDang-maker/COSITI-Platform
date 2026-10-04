package cm.cositi.api.commun.correlation;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class FiltreCorrelationTest {

    private final FiltreCorrelation filtre = new FiltreCorrelation();

    @Test
    void reprendLIdentifiantFourniParLeClient() throws Exception {
        MockHttpServletRequest requete = new MockHttpServletRequest();
        requete.addHeader("X-Correlation-Id", "front-1234-abcd");
        MockHttpServletResponse reponse = new MockHttpServletResponse();
        AtomicReference<String> vuDansLaChaine = new AtomicReference<>();

        filtre.doFilter(requete, reponse, new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest r, jakarta.servlet.ServletResponse s) {
                vuDansLaChaine.set(MDC.get(FiltreCorrelation.CLE_MDC));
            }
        });

        assertThat(vuDansLaChaine.get()).isEqualTo("front-1234-abcd");
        assertThat(FiltreCorrelation.courant(requete)).isEqualTo("front-1234-abcd");
        assertThat(reponse.getHeader("X-Correlation-Id")).isEqualTo("front-1234-abcd");
        assertThat(reponse.getHeader("X-Trace-Id")).isEqualTo("front-1234-abcd");
        assertThat(MDC.get(FiltreCorrelation.CLE_MDC)).isNull();
    }

    @Test
    void accepteLEnteteHistoriqueXTraceId() throws Exception {
        MockHttpServletRequest requete = new MockHttpServletRequest();
        requete.addHeader("X-Trace-Id", "trace-00000001");
        MockHttpServletResponse reponse = new MockHttpServletResponse();

        filtre.doFilter(requete, reponse, new MockFilterChain());

        assertThat(reponse.getHeader("X-Correlation-Id")).isEqualTo("trace-00000001");
    }

    @Test
    void genereUnIdentifiantSiLaValeurFournieEstInvalide() throws Exception {
        MockHttpServletRequest requete = new MockHttpServletRequest();
        requete.addHeader("X-Correlation-Id", "x\r\ninjection");
        MockHttpServletResponse reponse = new MockHttpServletResponse();

        filtre.doFilter(requete, reponse, new MockFilterChain());

        String id = reponse.getHeader("X-Correlation-Id");
        assertThat(id).isNotBlank().doesNotContain("injection");
        assertThat(java.util.UUID.fromString(id)).isNotNull();
    }
}
