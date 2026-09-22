package cm.cositi.api.securite.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.transaction.ExecuteurTransactionIndependante;
import cm.cositi.api.securite.dto.ChangerMotDePasseDto;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires purs (Mockito, sans base de données) du cœur métier de l'authentification :
 * verrouillage après échecs, séparation des sessions au changement de mot de passe, rejet du même mot de passe.
 */
@ExtendWith(MockitoExtension.class)
class ServiceAuthentificationImplTest {

    private static final PasswordEncoder ENCODEUR = new BCryptPasswordEncoder(12);

    @Mock
    private UtilisateurRepository utilisateurRepository;
    @Mock
    private ServiceJeton serviceJeton;
    @Mock
    private ServiceAudit serviceAudit;

    /**
     * Exécute le code immédiatement dans l'appelant : suffisant en test unitaire pur (pas de contexte
     * transactionnel Spring), le comportement REQUIRES_NEW réel est couvert par
     * {@code AuthentificationIntegrationTest} (Testcontainers).
     */
    private static final class TransactionIndependanteImmediate extends ExecuteurTransactionIndependante {
        TransactionIndependanteImmediate() {
            super(null);
        }

        @Override
        public void executer(Runnable action) {
            action.run();
        }
    }

    private ServiceAuthentificationImpl service;

    @BeforeEach
    void setUp() {
        service = new ServiceAuthentificationImpl(utilisateurRepository, ENCODEUR, serviceJeton, serviceAudit,
                new TransactionIndependanteImmediate());
    }

    private Utilisateur nouvelUtilisateur(String motDePasseClair) {
        Utilisateur u = new Utilisateur("jdupont", ENCODEUR.encode(motDePasseClair), "Jean Dupont");
        try {
            var champId = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
            champId.setAccessible(true);
            champId.set(u, UUID.randomUUID());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return u;
    }

    @Test
    void connexionEchoueeIncrementeLesTentatives() {
        Utilisateur u = nouvelUtilisateur("MotDePasseValide123!");
        when(utilisateurRepository.findByIdentifiant("jdupont")).thenReturn(Optional.of(u));

        assertThatThrownBy(() -> service.connecter("jdupont", "mauvais-mot-de-passe", "127.0.0.1", "test"))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "IDENTIFIANTS_INVALIDES");

        assertThat(u.getTentativesEchouees()).isEqualTo((short) 1);
        assertThat(u.getVerrouilleJusquA()).isNull();
    }

    @Test
    void cinquiemeEchecVerrouilleLeCompte() {
        Utilisateur u = nouvelUtilisateur("MotDePasseValide123!");
        when(utilisateurRepository.findByIdentifiant("jdupont")).thenReturn(Optional.of(u));

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> service.connecter("jdupont", "faux", "127.0.0.1", "test"))
                    .isInstanceOf(ExceptionMetier.class);
        }

        assertThat(u.getTentativesEchouees()).isEqualTo((short) 5);
        assertThat(u.getVerrouilleJusquA()).isNotNull();
        assertThat(u.estVerrouille()).isTrue();
    }

    @Test
    void compteVerrouilleRejetteLaConnexionMemeAvecLeBonMotDePasse() {
        Utilisateur u = nouvelUtilisateur("MotDePasseValide123!");
        u.setVerrouilleJusquA(Instant.now().plusSeconds(600));
        when(utilisateurRepository.findByIdentifiant("jdupont")).thenReturn(Optional.of(u));

        assertThatThrownBy(() -> service.connecter("jdupont", "MotDePasseValide123!", "127.0.0.1", "test"))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "COMPTE_VERROUILLE");
    }

    @Test
    void connexionReussieReinitialiseLesTentativesEtEmetDesJetons() {
        Utilisateur u = nouvelUtilisateur("MotDePasseValide123!");
        u.setTentativesEchouees((short) 3);
        when(utilisateurRepository.findByIdentifiant("jdupont")).thenReturn(Optional.of(u));
        when(serviceJeton.emettre(any(), any(), any()))
                .thenReturn(new PaireJetons("acces.jwt", "refresh-brut", 900));

        ResultatAuthentification reponse = service.connecter("jdupont", "MotDePasseValide123!", "127.0.0.1", "test");

        assertThat(reponse.jetonAcces()).isEqualTo("acces.jwt");
        assertThat(reponse.jetonRafraichissement()).isEqualTo("refresh-brut");
        assertThat(u.getTentativesEchouees()).isEqualTo((short) 0);
        assertThat(u.getVerrouilleJusquA()).isNull();
    }

    @Test
    void changerMotDePasseRefuseSiAncienIncorrect() {
        Utilisateur u = nouvelUtilisateur("AncienMotDePasse123!");
        ChangerMotDePasseDto dto = new ChangerMotDePasseDto("mauvais-ancien", "NouveauMotDePasse123!");

        assertThatThrownBy(() -> service.changerMotDePasse(u, dto))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "MOT_DE_PASSE_ACTUEL_INVALIDE");
    }

    @Test
    void changerMotDePasseRefuseSiIdentiqueALAncien() {
        Utilisateur u = nouvelUtilisateur("MemeMotDePasse123!");
        ChangerMotDePasseDto dto = new ChangerMotDePasseDto("MemeMotDePasse123!", "MemeMotDePasse123!");

        assertThatThrownBy(() -> service.changerMotDePasse(u, dto))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "MOT_DE_PASSE_IDENTIQUE");
    }

    @Test
    void changerMotDePasseRevoqueToutesLesSessions() {
        Utilisateur u = nouvelUtilisateur("AncienMotDePasse123!");
        ChangerMotDePasseDto dto = new ChangerMotDePasseDto("AncienMotDePasse123!", "NouveauMotDePasse456!");

        service.changerMotDePasse(u, dto);

        verify(serviceJeton, times(1)).revoquerTout(u.getId());
        assertThat(ENCODEUR.matches("NouveauMotDePasse456!", u.getMotDePasseHash())).isTrue();
    }
}
