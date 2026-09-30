package cm.cositi.api.organisation.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.organisation.entite.AffectationPortefeuille;
import cm.cositi.api.organisation.repository.AffectationPortefeuilleRepository;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.organisation.repository.ZoneRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServicePortefeuilleImplTest {

    @Mock
    private AffectationPortefeuilleRepository affectationRepository;
    @Mock
    private AdherentRepository adherentRepository;
    @Mock
    private AgentRepository agentRepository;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ZoneRepository zoneRepository;
    @Mock
    private ServiceParametre serviceParametre;
    @Mock
    private ApplicationEventPublisher publicateurEvenements;

    private ServicePortefeuilleImpl service;
    private Utilisateur auteur;

    @BeforeEach
    void setUp() throws Exception {
        service = new ServicePortefeuilleImpl(affectationRepository, adherentRepository, agentRepository,
                jdbcTemplate, serviceAudit, perimetre, zoneRepository, serviceParametre, publicateurEvenements);
        auteur = new Utilisateur("dga1", "hash", "DGA Un");
        setId(auteur, UUID.randomUUID());
    }

    private void setId(Object entite, UUID id) throws Exception {
        Field champ = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
        champ.setAccessible(true);
        champ.set(entite, id);
    }

    private AffectationPortefeuille affectationOuverte(UUID adherentId, UUID agentId) throws Exception {
        AffectationPortefeuille a = new AffectationPortefeuille(adherentId, agentId, LocalDate.now(), "motif initial",
                auteur.getId());
        Field champId = AffectationPortefeuille.class.getDeclaredField("id");
        champId.setAccessible(true);
        champId.set(a, UUID.randomUUID());
        return a;
    }

    @Test
    void retirerExigeUnMotif() {
        assertThatThrownBy(() -> service.retirer(UUID.randomUUID(), "  ", auteur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "PORTEFEUILLE_MOTIF_REQUIS");
    }

    @Test
    void retirerLeveExceptionSiAucuneAffectationOuverte() {
        UUID adherentId = UUID.randomUUID();
        when(affectationRepository.findByAdherentIdAndDateFinIsNull(adherentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.retirer(adherentId, "motif valable", auteur))
                .isInstanceOf(ExceptionRessourceIntrouvable.class)
                .hasFieldOrPropertyWithValue("code", "PORTEFEUILLE_AUCUNE_AFFECTATION");
    }

    @Test
    void retirerClotureLAffectationEtAuditeEtPublieEvenement() throws Exception {
        UUID adherentId = UUID.randomUUID();
        UUID agentId = UUID.randomUUID();
        AffectationPortefeuille ouverte = affectationOuverte(adherentId, agentId);
        when(affectationRepository.findByAdherentIdAndDateFinIsNull(adherentId)).thenReturn(Optional.of(ouverte));
        when(affectationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.retirer(adherentId, "Fin de collaboration", auteur);

        assertThat(ouverte.getDateFin()).isEqualTo(LocalDate.now());
        verify(serviceAudit).tracer(eq(TypeOperation.PORTEFEUILLE_RETRAIT), eq("affectation_portefeuille"),
                eq(ouverte.getId()), eq(agentId), eq(null), eq("Fin de collaboration"));
        verify(publicateurEvenements).publishEvent(any(AgentModifieEvent.class));
    }

    @Test
    void resumePortefeuilleRenvoieZeroSiAucuneAffectationOuverte() {
        UUID agentId = UUID.randomUUID();
        when(affectationRepository.findByAgentIdAndDateFinIsNull(agentId)).thenReturn(List.of());

        var resultat = service.resumePortefeuille(agentId, auteur);

        assertThat(resultat.totalAdherents()).isZero();
        assertThat(resultat.dossiersComplets()).isZero();
        assertThat(resultat.dossiersIncomplets()).isZero();
    }

    @Test
    void resumePortefeuilleCompteLesDossiersCompletsSelonLaFormuleCentralisee() throws Exception {
        UUID agentId = UUID.randomUUID();
        UUID adherentId1 = UUID.randomUUID();
        UUID adherentId2 = UUID.randomUUID();
        when(affectationRepository.findByAgentIdAndDateFinIsNull(agentId)).thenReturn(List.of(
                affectationOuverte(adherentId1, agentId), affectationOuverte(adherentId2, agentId)));

        Adherent complet = new Adherent("COSITI-00001", "Complet", "677000000", UUID.randomUUID(), UUID.randomUUID(),
                "loc", LocalDate.now());
        complet.setSexe("M");
        Adherent incomplet = new Adherent("COSITI-00002", "Incomplet", "677000001", UUID.randomUUID(), UUID.randomUUID(),
                "loc", LocalDate.now());

        when(adherentRepository.findAllById(any())).thenReturn(List.of(complet, incomplet));
        when(serviceParametre.texte("CHAMPS_COMPLETION_ADHERENT")).thenReturn("SEXE");
        when(serviceParametre.estValide("CHAMPS_COMPLETION_ADHERENT")).thenReturn(true);

        var resultat = service.resumePortefeuille(agentId, auteur);

        assertThat(resultat.totalAdherents()).isEqualTo(2);
        assertThat(resultat.dossiersComplets()).isEqualTo(1);
        assertThat(resultat.dossiersIncomplets()).isEqualTo(1);
    }

    @Test
    void chargeCalculeUnMontantReelDepuisLesPaiements() {
        UUID agentId = UUID.randomUUID();
        cm.cositi.api.organisation.entite.Agent agent =
                new cm.cositi.api.organisation.entite.Agent("AG-00001", "Agent Test", "690000000", UUID.randomUUID());
        agent.setObjectifCollecteMensuel(BigDecimal.valueOf(50000));
        when(agentRepository.findById(agentId)).thenReturn(Optional.of(agent));
        when(affectationRepository.findByAgentIdAndDateFinIsNull(agentId)).thenReturn(List.of());
        when(jdbcTemplate.queryForObject(anyString(), eq(BigDecimal.class), any(), any()))
                .thenReturn(BigDecimal.valueOf(15000));

        var resultat = service.charge(agentId, YearMonth.of(2026, 9));

        assertThat(resultat.montantCollecte()).isEqualByComparingTo("15000");
        assertThat(resultat.objectifCollecteMensuel()).isEqualByComparingTo("50000");
    }

    @Test
    void distributionAgregeParAgent() {
        UUID agentId = UUID.randomUUID();
        Map<String, Object> ligne = Map.of("agent_id", agentId, "code_agent", "AG-00001",
                "nom_complet", "Agent Test", "nombre_adherents", 7L);
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(ligne));

        var resultat = service.distribution(auteur);

        assertThat(resultat).hasSize(1);
        assertThat(resultat.get(0).agentId()).isEqualTo(agentId);
        assertThat(resultat.get(0).nombreAdherents()).isEqualTo(7L);
    }
}
