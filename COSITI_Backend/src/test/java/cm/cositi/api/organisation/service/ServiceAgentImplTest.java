package cm.cositi.api.organisation.service;

import cm.cositi.api.audit.JournalAuditRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.organisation.dto.AgentDto;
import cm.cositi.api.organisation.dto.ChangerStatutAgentDto;
import cm.cositi.api.organisation.dto.CreationAgentDto;
import cm.cositi.api.organisation.dto.ModificationAgentDto;
import cm.cositi.api.organisation.entite.Agent;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.organisation.repository.HistoriqueDesignationChefRepository;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.RoleRepository;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceAgentImplTest {

    @Mock
    private AgentRepository agentRepository;
    @Mock
    private HistoriqueDesignationChefRepository historiqueRepository;
    @Mock
    private UtilisateurRepository utilisateurRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder encodeurMotDePasse;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private JournalAuditRepository journalAuditRepository;
    @Mock
    private ApplicationEventPublisher publicateurEvenements;

    private ServiceAgentImpl service;
    private Utilisateur dga;
    private Utilisateur nonDga;

    @BeforeEach
    void setUp() throws Exception {
        service = new ServiceAgentImpl(agentRepository, historiqueRepository, utilisateurRepository, roleRepository,
                encodeurMotDePasse, jdbcTemplate, serviceAudit, journalAuditRepository, publicateurEvenements);

        dga = new Utilisateur("dga1", "hash", "DGA Un");
        setId(dga, UUID.randomUUID());
        Role roleDga = roleAvecCode("DGA");
        dga.ajouterRole(roleDga);

        nonDga = new Utilisateur("gest1", "hash", "Gestionnaire Un");
        setId(nonDga, UUID.randomUUID());
    }

    private Role roleAvecCode(String code) throws Exception {
        var constructeur = Role.class.getDeclaredConstructor();
        constructeur.setAccessible(true);
        Role r = constructeur.newInstance();
        Field champCode = Role.class.getDeclaredField("code");
        champCode.setAccessible(true);
        champCode.set(r, code);
        return r;
    }

    private void setId(Object entite, UUID id) throws Exception {
        Field champ = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
        champ.setAccessible(true);
        champ.set(entite, id);
    }

    private Agent agentAvecId(UUID zoneId, UUID utilisateurId) throws Exception {
        Agent a = new Agent("AG-00001", "Agent Test", "690000000", zoneId);
        setId(a, UUID.randomUUID());
        a.setUtilisateurId(utilisateurId);
        return a;
    }

    @Test
    void creerParDgaRefuseSiAuteurNestPasDga() {
        var dto = new CreationAgentDto("nouvel.agent", "Nouvel Agent", "690000001", UUID.randomUUID(), null);

        assertThatThrownBy(() -> service.creerParDga(dto, nonDga))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasFieldOrPropertyWithValue("code", "ORGANISATION_RESERVE_DGA");
    }

    @Test
    void creerParDgaRefuseSiIdentifiantDejaUtilise() {
        var dto = new CreationAgentDto("existe.deja", "Nouvel Agent", "690000001", UUID.randomUUID(), null);
        when(utilisateurRepository.existsByIdentifiant("existe.deja")).thenReturn(true);

        assertThatThrownBy(() -> service.creerParDga(dto, dga))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "UTILISATEUR_IDENTIFIANT_EXISTANT");
    }

    @Test
    void designerChefRefuseSiAuteurNestPasDga() throws Exception {
        assertThatThrownBy(() -> service.designerChef(UUID.randomUUID(), "motif valable", nonDga))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasFieldOrPropertyWithValue("code", "ORGANISATION_RESERVE_DGA");
    }

    @Test
    void designerChefExigeUnMotif() {
        assertThatThrownBy(() -> service.designerChef(UUID.randomUUID(), "  ", dga))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "ORGANISATION_MOTIF_REQUIS");
    }

    @Test
    void designerChefRefuseSiUnChefExisteDejaPourLaZone() throws Exception {
        UUID zoneId = UUID.randomUUID();
        Agent candidat = agentAvecId(zoneId, UUID.randomUUID());
        when(agentRepository.findById(candidat.getId())).thenReturn(Optional.of(candidat));
        when(historiqueRepository.findTopByZoneIdOrderByHorodatageDesc(zoneId))
                .thenReturn(Optional.of(org.mockito.Mockito.mock(
                        cm.cositi.api.organisation.entite.HistoriqueDesignationChef.class)));

        assertThatThrownBy(() -> service.designerChef(candidat.getId(), "motif valable", dga))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "ORGANISATION_CHEF_DEJA_DESIGNE");
    }

    @Test
    void remplacerChefRefuseSiAucunChefActuel() throws Exception {
        UUID zoneId = UUID.randomUUID();
        Agent candidat = agentAvecId(zoneId, UUID.randomUUID());
        when(agentRepository.findById(candidat.getId())).thenReturn(Optional.of(candidat));
        when(historiqueRepository.findTopByZoneIdOrderByHorodatageDesc(zoneId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.remplacerChef(candidat.getId(), "motif valable", dga))
                .isInstanceOf(ExceptionRessourceIntrouvable.class)
                .hasFieldOrPropertyWithValue("code", "ORGANISATION_AUCUN_CHEF");
    }

    @Test
    void modifierRefuseSiAuteurNestPasDga() {
        var dto = new ModificationAgentDto("Nouveau nom", "690000002", null, null);

        assertThatThrownBy(() -> service.modifier(UUID.randomUUID(), dto, nonDga))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasFieldOrPropertyWithValue("code", "ORGANISATION_RESERVE_DGA");
    }

    @Test
    void modifierMetAJourLesChampsEtAuditeSansToucherAuStatut() throws Exception {
        Agent agent = agentAvecId(UUID.randomUUID(), UUID.randomUUID());
        when(agentRepository.findById(agent.getId())).thenReturn(Optional.of(agent));
        when(agentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        UUID nouvelleZone = UUID.randomUUID();

        AgentDto resultat = service.modifier(agent.getId(),
                new ModificationAgentDto("Nom Modifié", "690000099", nouvelleZone, BigDecimal.TEN), dga);

        assertThat(resultat.nomComplet()).isEqualTo("Nom Modifié");
        assertThat(resultat.zoneId()).isEqualTo(nouvelleZone);
        assertThat(agent.isActif()).isTrue();
        verify(serviceAudit).tracer(eq(TypeOperation.AGENT_MODIFICATION), eq("agent"), eq(agent.getId()), any(),
                any(), any());
    }

    @Test
    void changerStatutExigeUnMotif() {
        var dto = new ChangerStatutAgentDto(false, "  ");
        assertThatThrownBy(() -> service.changerStatut(UUID.randomUUID(), dto, dga))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "AGENT_MOTIF_REQUIS");
    }

    @Test
    void changerStatutRefuseSiStatutInchange() throws Exception {
        Agent agent = agentAvecId(UUID.randomUUID(), UUID.randomUUID());
        when(agentRepository.findById(agent.getId())).thenReturn(Optional.of(agent));

        assertThatThrownBy(() -> service.changerStatut(agent.getId(), new ChangerStatutAgentDto(true, "motif"), dga))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "AGENT_STATUT_INCHANGE");
    }

    @Test
    void changerStatutDesactiveEtAuditeAvecMotif() throws Exception {
        Agent agent = agentAvecId(UUID.randomUUID(), UUID.randomUUID());
        when(agentRepository.findById(agent.getId())).thenReturn(Optional.of(agent));
        when(agentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AgentDto resultat = service.changerStatut(agent.getId(),
                new ChangerStatutAgentDto(false, "Congé longue durée"), dga);

        assertThat(resultat.actif()).isFalse();
        verify(serviceAudit).tracer(eq(TypeOperation.AGENT_CHANGEMENT_STATUT), eq("agent"), eq(agent.getId()),
                eq(true), eq(false), eq("Congé longue durée"));
    }
}
