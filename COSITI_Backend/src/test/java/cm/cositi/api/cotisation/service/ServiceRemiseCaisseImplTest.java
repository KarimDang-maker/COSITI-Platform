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

    // ------------------------------------------------------------------ Déclaration (recette 05/10/2026)

    private cm.cositi.api.cotisation.entite.Paiement paiement(UUID encaisseur, UUID remise) throws Exception {
        var p = new cm.cositi.api.cotisation.entite.Paiement(UUID.randomUUID(), "REC-0001" + (int) (Math.random() * 90 + 10),
                LocalDate.now(), BigDecimal.valueOf(1000), "ESPECES", null, "COTISATION", encaisseur, null);
        Field id = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
        id.setAccessible(true);
        id.set(p, UUID.randomUUID());
        p.setRemiseCaisseId(remise);
        return p;
    }

    @Test
    void declarerRefuseUneCotisationEncaisseeParUnAutreAgent() throws Exception {
        var p = paiement(UUID.randomUUID(), null);
        when(agentRepository.existsById(agentId)).thenReturn(true);
        when(paiementRepository.findAllById(any())).thenReturn(java.util.List.of(p));

        assertThatThrownBy(() -> service.declarer(agentId, java.util.List.of(p.getId()), agentUtilisateur))
                .hasFieldOrPropertyWithValue("code", "REMISE_PAIEMENT_AUTRE_AGENT");
    }

    @Test
    void declarerRefuseUneCotisationDejaRemise() throws Exception {
        var p = paiement(agentId, UUID.randomUUID());
        when(agentRepository.existsById(agentId)).thenReturn(true);
        when(paiementRepository.findAllById(any())).thenReturn(java.util.List.of(p));

        assertThatThrownBy(() -> service.declarer(agentId, java.util.List.of(p.getId()), agentUtilisateur))
                .hasFieldOrPropertyWithValue("code", "REMISE_PAIEMENT_DEJA_REMIS");
    }

    @Test
    void declarerRefuseUneCotisationAnnulee() throws Exception {
        var p = paiement(agentId, null);
        p.annuler("Erreur");
        when(agentRepository.existsById(agentId)).thenReturn(true);
        when(paiementRepository.findAllById(any())).thenReturn(java.util.List.of(p));

        assertThatThrownBy(() -> service.declarer(agentId, java.util.List.of(p.getId()), agentUtilisateur))
                .hasFieldOrPropertyWithValue("code", "REMISE_PAIEMENT_NON_ENCAISSE");
    }

    @Test
    void declarerNotifieLaDafEtCompteLesCotisations() throws Exception {
        var p1 = paiement(agentId, null);
        var p2 = paiement(agentId, null);
        when(agentRepository.existsById(agentId)).thenReturn(true);
        when(paiementRepository.findAllById(any())).thenReturn(java.util.List.of(p1, p2));
        when(remiseCaisseRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var dto = service.declarer(agentId, java.util.List.of(p1.getId(), p2.getId(), p1.getId()), agentUtilisateur);

        org.assertj.core.api.Assertions.assertThat(dto.montantDeclare()).isEqualByComparingTo("2000");
        org.assertj.core.api.Assertions.assertThat(dto.nombrePaiements()).isEqualTo(2);
        org.mockito.Mockito.verify(serviceNotification).notifierRoles(org.mockito.ArgumentMatchers.eq(java.util.List.of("DAF")),
                org.mockito.ArgumentMatchers.eq("REMISE_CAISSE_A_RECEPTIONNER"), any(), any(),
                org.mockito.ArgumentMatchers.eq("remise_caisse"), any());
    }

    @Test
    void receptionnerRefuseUneSecondeReception() throws Exception {
        RemiseCaisse remise = remiseDeLAgent();
        remise.receptionner(BigDecimal.valueOf(1000), UUID.randomUUID());
        when(remiseCaisseRepository.findById(remise.getId())).thenReturn(Optional.of(remise));
        Utilisateur daf = new Utilisateur("daf1", "hash", "DAF");

        assertThatThrownBy(() -> service.receptionner(remise.getId(), BigDecimal.valueOf(1000), daf))
                .hasFieldOrPropertyWithValue("code", "REMISE_CAISSE_DEJA_RECEPTIONNEE");
    }
}
