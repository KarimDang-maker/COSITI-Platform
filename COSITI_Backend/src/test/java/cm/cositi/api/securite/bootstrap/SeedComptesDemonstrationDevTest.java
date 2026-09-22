package cm.cositi.api.securite.bootstrap;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.organisation.repository.ZoneRepository;
import cm.cositi.api.securite.repository.RoleRepository;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Double verrou de {@code SeedComptesDemonstrationDev} contre une exécution en profil prod (au-delà de
 * l'annotation {@code @Profile}, testée ici en instanciant directement le composant — Java n'applique pas
 * cette annotation hors conteneur Spring, ce qui isole précisément la vérification explicite en code) et
 * idempotence. Le comportement de création réelle des 8 comptes est vérifié bout en bout par
 * {@code SeedComptesDemonstrationDevIntegrationTest} (contexte Spring réel, profil dev).
 */
@ExtendWith(MockitoExtension.class)
class SeedComptesDemonstrationDevTest {

    @Mock
    private Environment environment;
    @Mock
    private UtilisateurRepository utilisateurRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private AgentRepository agentRepository;
    @Mock
    private ZoneRepository zoneRepository;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private PasswordEncoder encodeurMotDePasse;
    @Mock
    private ServiceAudit serviceAudit;

    private SeedComptesDemonstrationDev seed() {
        return new SeedComptesDemonstrationDev(environment, utilisateurRepository, roleRepository, agentRepository,
                zoneRepository, jdbcTemplate, encodeurMotDePasse, serviceAudit);
    }

    @Test
    void neCreeAbsolumentAucunCompteSiProdFigureParmiLesProfilsActifs() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"dev", "prod"});

        seed().run(new DefaultApplicationArguments());

        verify(utilisateurRepository, never()).existsByIdentifiant(anyString());
        verify(utilisateurRepository, never()).save(any());
        verify(roleRepository, never()).findByCode(anyString());
        verify(serviceAudit, never()).tracer(any(), any(), any(), any(), any(), any());
    }

    @Test
    void estIdempotentNeRecreeAucunCompteDejaExistant() {
        lenient().when(environment.getActiveProfiles()).thenReturn(new String[]{"dev"});
        lenient().when(jdbcTemplate.queryForList("SELECT id FROM zone LIMIT 1", UUID.class))
                .thenReturn(List.of(UUID.randomUUID()));
        lenient().when(utilisateurRepository.existsByIdentifiant(anyString())).thenReturn(true);

        seed().run(new DefaultApplicationArguments());

        verify(utilisateurRepository, never()).save(any());
        verify(roleRepository, never()).findByCode(anyString());
        verify(serviceAudit, never()).tracer(any(), any(), any(), any(), any(), any());
    }
}
