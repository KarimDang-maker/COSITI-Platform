package cm.cositi.api.commun.exception;

import org.junit.jupiter.api.Test;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

/** Une connexion fermée par le navigateur n'est pas une erreur serveur (recette E2E du 05/10/2026). */
class GestionnaireExceptionsTest {

    @Test
    void reconnaitUneDeconnexionDuClient() {
        assertThat(GestionnaireExceptions.estDeconnexionClient(
                new AsyncRequestNotUsableException("Response not usable after response errors."))).isTrue();
        assertThat(GestionnaireExceptions.estDeconnexionClient(new RuntimeException("x",
                new IOException("Une connexion établie a été abandonnée par un logiciel de votre ordinateur hôte"))))
                .isTrue();
        assertThat(GestionnaireExceptions.estDeconnexionClient(new IOException("Broken pipe"))).isTrue();
    }

    @Test
    void uneVraieErreurResteUneErreur() {
        assertThat(GestionnaireExceptions.estDeconnexionClient(new IllegalStateException("Pack introuvable"))).isFalse();
        assertThat(GestionnaireExceptions.estDeconnexionClient(new IOException("Disque plein"))).isFalse();
    }
}
