package cm.cositi.api.adhesion.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adhesion.dto.EnregistrerFraisAdhesionDto;
import cm.cositi.api.adhesion.dto.ResolutionAnomalieFraisDto;
import cm.cositi.api.adhesion.entite.FraisAdhesion;
import cm.cositi.api.adhesion.entite.StatutFraisAdhesion;
import cm.cositi.api.adhesion.repository.FraisAdhesionRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.entite.EntiteAuditable;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.organisation.entite.Agent;
import cm.cositi.api.organisation.repository.AgentRepository;
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
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceFraisAdhesionImplTest {

    @Mock
    private FraisAdhesionRepository fraisRepository;
    @Mock
    private AdherentRepository adherentRepository;
    @Mock
    private AgentRepository agentRepository;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ServiceParametre serviceParametre;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private ApplicationEventPublisher evenements;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private ServiceFraisAdhesionImpl service;
    private Adherent adherent;
    private Agent agent;
    private Utilisateur gestionnaire;
    private Utilisateur daf;

    @BeforeEach
    void setUp() {
        service = new ServiceFraisAdhesionImpl(fraisRepository, adherentRepository, agentRepository, perimetre,
                serviceParametre, serviceAudit, evenements, jdbcTemplate);
        adherent = new Adherent("COSITI-00500", "Mbog", "677500500", UUID.randomUUID(), UUID.randomUUID(), "Marché",
                LocalDate.now().minusDays(3));
        fixerId(adherent, UUID.randomUUID());
        agent = new Agent("AG-00050", "Agent Collecteur", "690000050", UUID.randomUUID());
        fixerId(agent, UUID.randomUUID());
        gestionnaire = utilisateur();
        daf = utilisateur();
        lenient().when(serviceParametre.decimal("MONTANT_INSCRIPTION")).thenReturn(new BigDecimal("1000"));
        lenient().when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        lenient().when(agentRepository.findById(agent.getId())).thenReturn(Optional.of(agent));
        lenient().when(fraisRepository.saveAndFlush(any(FraisAdhesion.class))).thenAnswer(i -> i.getArgument(0));
        lenient().when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(123L);
    }

    @Test
    void enregistrerRattacheLeFraisAAdherentEtAAgentAvecLeMontantDuParametre() {
        var resultat = service.enregistrer(adherent.getId(),
                new EnregistrerFraisAdhesionDto(agent.getId(), null, null, null, null), gestionnaire);

        assertThat(resultat.dejaExistant()).isFalse();
        assertThat(resultat.frais().reference()).isEqualTo("FAD-000123");
        assertThat(resultat.frais().adherentId()).isEqualTo(adherent.getId());
        assertThat(resultat.frais().agentId()).isEqualTo(agent.getId());
        assertThat(resultat.frais().montantAttendu()).isEqualByComparingTo("1000");
        assertThat(resultat.frais().montantRecu()).isEqualByComparingTo("1000");
        assertThat(adherent.isInscriptionPayee()).isTrue();
        verify(serviceAudit).tracer(eq(TypeOperation.FRAIS_ADHESION_ENREGISTREMENT), eq("frais_adhesion"), any(), any(),
                any(), any());
        verify(evenements, never()).publishEvent(any(AdhesionEvent.class));
    }

    @Test
    void unMontantRecuDifferentEstEnregistreTelQuelEtSignaleAuDaf() {
        var resultat = service.enregistrer(adherent.getId(),
                new EnregistrerFraisAdhesionDto(agent.getId(), new BigDecimal("500"), null, null, null), gestionnaire);

        assertThat(resultat.frais().ecart()).isEqualByComparingTo("-500");
        assertThat(adherent.isInscriptionPayee()).isFalse();
        verify(evenements).publishEvent(any(AdhesionEvent.class));
    }

    @Test
    void unSecondFraisPourLeMemeAdherentEstRefuse() {
        FraisAdhesion existant = frais(gestionnaire);
        when(fraisRepository.findByAdherentIdAndTypeFrais(adherent.getId(), "ADHESION")).thenReturn(Optional.of(existant));

        assertThatThrownBy(() -> service.enregistrer(adherent.getId(),
                new EnregistrerFraisAdhesionDto(agent.getId(), null, null, null, null), gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "FRAIS_ADHESION_DEJA_ENREGISTRE");
        verify(fraisRepository, never()).saveAndFlush(any());
    }

    @Test
    void uneCleDIdempotenceRejoueeRenvoieLeFraisExistantSansEnCreerUnAutre() {
        FraisAdhesion existant = frais(gestionnaire);
        when(fraisRepository.findByCleIdempotence("cle-1")).thenReturn(Optional.of(existant));

        var resultat = service.enregistrer(adherent.getId(),
                new EnregistrerFraisAdhesionDto(agent.getId(), null, null, null, "cle-1"), gestionnaire);

        assertThat(resultat.dejaExistant()).isTrue();
        verify(fraisRepository, never()).saveAndFlush(any());
    }

    @Test
    void lAgentCollecteurDoitExister() {
        UUID inconnu = UUID.randomUUID();

        assertThatThrownBy(() -> service.enregistrer(adherent.getId(),
                new EnregistrerFraisAdhesionDto(inconnu, null, null, null, null), gestionnaire))
                .isInstanceOf(ExceptionRessourceIntrouvable.class)
                .hasFieldOrPropertyWithValue("code", "AGENT_INTROUVABLE");
    }

    @Test
    void celuiQuiEnregistreNeValidePasLEncaissement() {
        FraisAdhesion frais = frais(gestionnaire);
        when(fraisRepository.findById(frais.getId())).thenReturn(Optional.of(frais));

        assertThatThrownBy(() -> service.valider(frais.getId(), null, gestionnaire))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "FRAIS_ADHESION_AUTO_VALIDATION_INTERDITE");
    }

    @Test
    void unFraisEnAnomalieNeSeValidePasAvantResolution() {
        FraisAdhesion frais = frais(gestionnaire);
        frais.signalerAnomalie(daf.getId(), "Montant non remis");
        when(fraisRepository.findById(frais.getId())).thenReturn(Optional.of(frais));

        assertThatThrownBy(() -> service.valider(frais.getId(), null, daf))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "FRAIS_ADHESION_ANOMALIE_NON_RESOLUE");
    }

    @Test
    void validationParUnAutreUtilisateur() {
        FraisAdhesion frais = frais(gestionnaire);
        when(fraisRepository.findById(frais.getId())).thenReturn(Optional.of(frais));

        var resultat = service.valider(frais.getId(), null, daf);

        assertThat(resultat.statut()).isEqualTo(StatutFraisAdhesion.VALIDE);
        assertThat(resultat.validePar()).isEqualTo(daf.getId());
    }

    @Test
    void signalerUneAnomalieExigeUnMotif() {
        assertThatThrownBy(() -> service.signalerAnomalie(UUID.randomUUID(), " ", daf))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "FRAIS_ADHESION_MOTIF_REQUIS");
    }

    @Test
    void laResolutionCorrigeLeMontantDeFaconTracee() {
        FraisAdhesion frais = frais(gestionnaire);
        frais.signalerAnomalie(daf.getId(), "Reçu de 500 seulement");
        when(fraisRepository.findById(frais.getId())).thenReturn(Optional.of(frais));

        var resultat = service.resoudreAnomalie(frais.getId(),
                new ResolutionAnomalieFraisDto("Complément de 500 remis par l'agent", new BigDecimal("1000")), daf);

        assertThat(resultat.statut()).isEqualTo(StatutFraisAdhesion.ENREGISTRE);
        assertThat(resultat.montantRecu()).isEqualByComparingTo("1000");
        verify(serviceAudit).tracer(eq(TypeOperation.FRAIS_ADHESION_ANOMALIE_RESOLUE), eq("frais_adhesion"),
                eq(frais.getId()), any(), any(), eq("Complément de 500 remis par l'agent"));
    }

    @Test
    void lAuteurDeLEnregistrementNeResoutPasLAnomalie() {
        FraisAdhesion frais = frais(gestionnaire);
        frais.signalerAnomalie(daf.getId(), "Écart");
        when(fraisRepository.findById(frais.getId())).thenReturn(Optional.of(frais));

        assertThatThrownBy(() -> service.resoudreAnomalie(frais.getId(),
                new ResolutionAnomalieFraisDto("ok", null), gestionnaire))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "FRAIS_ADHESION_AUTO_RESOLUTION_INTERDITE");
    }

    private FraisAdhesion frais(Utilisateur auteur) {
        FraisAdhesion f = new FraisAdhesion("FAD-000001", adherent.getId(), agent.getId(), new BigDecimal("1000"),
                new BigDecimal("1000"), LocalDate.now(), auteur.getId(), null, null);
        fixerId(f, UUID.randomUUID());
        return f;
    }

    private static Utilisateur utilisateur() {
        Utilisateur u = mock(Utilisateur.class);
        UUID id = UUID.randomUUID();
        lenient().when(u.getId()).thenReturn(id);
        return u;
    }

    private static void fixerId(Object entite, UUID id) {
        try {
            Field champ = EntiteAuditable.class.getDeclaredField("id");
            champ.setAccessible(true);
            champ.set(entite, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
