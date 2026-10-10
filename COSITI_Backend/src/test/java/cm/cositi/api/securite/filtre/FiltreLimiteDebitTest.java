package cm.cositi.api.securite.filtre;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Limitation de débit (jalon J11), testée en isolation.
 *
 * <p>Le filtre est désactivé dans la suite d'intégration — elle enchaîne des dizaines de connexions depuis
 * la même adresse et l'atteindrait pour une raison sans rapport avec ce qu'elle vérifie. Son comportement
 * réel est donc couvert ici, sans contexte Spring.</p>
 */
class FiltreLimiteDebitTest {

    /**
     * Même configuration que l'ObjectMapper de l'application : `ReponseErreur` porte un `Instant`, que
     * Jackson ne sait sérialiser qu'avec le module JSR-310. Un mapper nu ferait échouer le filtre au
     * moment précis où il doit répondre proprement.
     */
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

    private FiltreLimiteDebit filtre;

    @BeforeEach
    void setUp() {
        // Connexion : 3 par tranche de 15 min · écriture : 2/min · lecture : 5/min.
        filtre = new FiltreLimiteDebit(MAPPER, 3, 2, 5, true);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletResponse appeler(String methode, String chemin, String adresse) throws Exception {
        MockHttpServletRequest requete = new MockHttpServletRequest(methode, chemin);
        requete.setRequestURI(chemin);
        requete.setRemoteAddr(adresse);
        MockHttpServletResponse reponse = new MockHttpServletResponse();
        FilterChain chaine = new MockFilterChain();
        filtre.doFilter(requete, reponse, chaine);
        return reponse;
    }

    @Test
    void laisse_passer_les_appels_sous_la_limite() throws Exception {
        for (int i = 0; i < 3; i++) {
            assertThat(appeler("POST", "/api/v1/auth/connexion", "10.0.0.1").getStatus()).isEqualTo(200);
        }
    }

    @Test
    void refuse_au_dela_de_la_limite_avec_un_429_et_un_retry_after() throws Exception {
        for (int i = 0; i < 3; i++) {
            appeler("POST", "/api/v1/auth/connexion", "10.0.0.2");
        }

        MockHttpServletResponse refusee = appeler("POST", "/api/v1/auth/connexion", "10.0.0.2");

        assertThat(refusee.getStatus()).isEqualTo(429);
        // Le client sait lire cet en-tête depuis le jalon J1 (`api/client.ts`).
        assertThat(refusee.getHeader("Retry-After")).isNotNull();
        assertThat(Long.parseLong(refusee.getHeader("Retry-After"))).isPositive();
        assertThat(refusee.getContentAsString()).contains("LIMITE_DEBIT_ATTEINTE");
        // Une réponse d'erreur ne doit pas être mise en cache par un intermédiaire.
        assertThat(refusee.getHeader("Cache-Control")).isEqualTo("no-store");
    }

    @Test
    void compte_separement_deux_adresses_differentes() throws Exception {
        for (int i = 0; i < 3; i++) {
            appeler("POST", "/api/v1/auth/connexion", "10.0.0.3");
        }
        assertThat(appeler("POST", "/api/v1/auth/connexion", "10.0.0.3").getStatus()).isEqualTo(429);

        // Un poste voisin n'est pas puni pour le trafic d'un autre.
        assertThat(appeler("POST", "/api/v1/auth/connexion", "10.0.0.4").getStatus()).isEqualTo(200);
    }

    @Test
    void compte_separement_les_lectures_et_les_ecritures() throws Exception {
        // 2 écritures autorisées, 5 lectures : épuiser les écritures ne doit pas bloquer les lectures.
        for (int i = 0; i < 2; i++) {
            appeler("POST", "/api/v1/adherents", "10.0.0.5");
        }
        assertThat(appeler("POST", "/api/v1/adherents", "10.0.0.5").getStatus()).isEqualTo(429);
        assertThat(appeler("GET", "/api/v1/adherents", "10.0.0.5").getStatus()).isEqualTo(200);
    }

    @Test
    void compte_par_utilisateur_authentifie_et_non_par_adresse() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("agent.un", null, List.of()));
        for (int i = 0; i < 2; i++) {
            appeler("POST", "/api/v1/adherents", "10.0.0.6");
        }
        assertThat(appeler("POST", "/api/v1/adherents", "10.0.0.6").getStatus()).isEqualTo(429);

        // Deux agents partageant la connexion du bureau ont chacun leur quota : c'est le cas courant à la
        // COSITI, et les confondre bloquerait le second sans qu'il ait rien fait.
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("agent.deux", null, List.of()));
        assertThat(appeler("POST", "/api/v1/adherents", "10.0.0.6").getStatus()).isEqualTo(200);
    }

    @Test
    void utilise_l_adresse_reelle_derriere_un_repartiteur() throws Exception {
        MockHttpServletRequest requete = new MockHttpServletRequest("POST", "/api/v1/auth/connexion");
        requete.setRequestURI("/api/v1/auth/connexion");
        requete.setRemoteAddr("172.16.0.1"); // adresse du répartiteur, identique pour tout le monde
        requete.addHeader("X-Forwarded-For", "41.202.0.9, 172.16.0.1");

        for (int i = 0; i < 3; i++) {
            MockHttpServletResponse reponse = new MockHttpServletResponse();
            filtre.doFilter(requete, reponse, new MockFilterChain());
        }

        MockHttpServletResponse refusee = new MockHttpServletResponse();
        filtre.doFilter(requete, refusee, new MockFilterChain());
        assertThat(refusee.getStatus()).isEqualTo(429);

        // Un autre client réel derrière le même répartiteur n'est pas affecté.
        MockHttpServletRequest autre = new MockHttpServletRequest("POST", "/api/v1/auth/connexion");
        autre.setRequestURI("/api/v1/auth/connexion");
        autre.setRemoteAddr("172.16.0.1");
        autre.addHeader("X-Forwarded-For", "41.202.0.10, 172.16.0.1");
        MockHttpServletResponse acceptee = new MockHttpServletResponse();
        filtre.doFilter(autre, acceptee, new MockFilterChain());
        assertThat(acceptee.getStatus()).isEqualTo(200);
    }

    @Test
    void ne_filtre_rien_quand_il_est_desactive() throws Exception {
        FiltreLimiteDebit inactif = new FiltreLimiteDebit(MAPPER, 1, 1, 1, false);

        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest requete = new MockHttpServletRequest("POST", "/api/v1/auth/connexion");
            requete.setRequestURI("/api/v1/auth/connexion");
            requete.setRemoteAddr("10.0.0.7");
            MockHttpServletResponse reponse = new MockHttpServletResponse();
            inactif.doFilter(requete, reponse, new MockFilterChain());
            assertThat(reponse.getStatus()).isEqualTo(200);
        }
    }
}
