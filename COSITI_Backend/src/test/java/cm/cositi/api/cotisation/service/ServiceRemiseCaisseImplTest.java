package cm.cositi.api.cotisation.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.cotisation.entite.RemiseCaisse;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.cotisation.repository.RemiseCaisseRepository;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceRemiseCaisseImplTest {

    @Mock
    private RemiseCaisseRepository remiseCaisseRepository;
    @Mock
    private PaiementRepository paiementRepository;
    @Mock
    private AgentRepository agentRepository;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private cm.cositi.api.notification.ServiceNotification serviceNotification;

    private ServiceRemiseCaisseImpl service;
    private UUID agentId;
    private Utilisateur agentUtilisateur;

    @BeforeEach
    void setUp() throws Exception {
        service = new ServiceRemiseCaisseImpl(remiseCaisseRepository, paiementRepository, agentRepository,
                jdbcTemplate, serviceAudit, serviceNotification);
        agentId = UUID.randomUUID();
        agentUtilisateur = new Utilisateur("agent1", "hash", "Agent Un");
        agentUtilisateur.setAgentId(agentId);
        Field champId = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
        champId.setAccessible(true);
        champId.set(agentUtilisateur, UUID.randomUUID());
    }

    private RemiseCaisse remiseDeLAgent() throws Exception {
        Constructor<RemiseCaisse> constructeur = RemiseCaisse.class.getDeclaredConstructor(
                UUID.class, LocalDate.class, BigDecimal.class, String.class);
        constructeur.setAccessible(true);
        RemiseCaisse remise = constructeur.newInstance(agentId, LocalDate.now(), BigDecimal.valueOf(1000), "agent1");
        Field champId = RemiseCaisse.class.getDeclaredField("id");
        champId.setAccessible(true);
        champId.set(remise, UUID.randomUUID());
        return remise;
    }

    @Test
    void receptionnerRefuseSiLeReceveurEstLAgentLuiMeme() throws Exception {
        RemiseCaisse remise = remiseDeLAgent();
        when(remiseCaisseRepository.findById(remise.getId())).thenReturn(Optional.of(remise));

        assertThatThrownBy(() -> service.receptionner(remise.getId(), BigDecimal.valueOf(1000), agentUtilisateur))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasFieldOrPropertyWithValue("code", "REMISE_CAISSE_AUTO_RECEPTION_INTERDITE");
    }
}
