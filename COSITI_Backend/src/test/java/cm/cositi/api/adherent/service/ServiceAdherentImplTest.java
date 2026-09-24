package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.dto.CreationAdherentDto;
import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.Pack;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.repository.AdhesionRepository;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.PackRepository;
import cm.cositi.api.adherent.exception.ExceptionDoublonPotentiel;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceAdherentImplTest {

    @Mock
    private AdherentRepository adherentRepository;
    @Mock
    private AdhesionRepository adhesionRepository;
    @Mock
    private PackRepository packRepository;
    @Mock
    private ServiceMatricule serviceMatricule;
    @Mock
    private ServiceDoublonAdherent serviceDoublonAdherent;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ServiceAudit serviceAudit;
    /** Sert au libellé de zone des réponses de lecture (jalon J12) ; aucun test ici ne le sollicite. */
    @Mock
    private cm.cositi.api.organisation.repository.ZoneRepository zoneRepository;
    /** Correctif COSITI V1 §5/§7-§8 ; aucun test de ce fichier ne sollicite la préinscription/finalisation. */
    @Mock
    private cm.cositi.api.adherent.repository.PreferenceAllocationAdherentRepository preferenceAllocationRepository;
    @Mock
    private cm.cositi.api.parametre.ServiceParametre serviceParametre;
    @Mock
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    /** Correctif RAPORT_V1 §6.3/§7.2 ; aucun test de ce fichier ne sollicite le changement d'allocation. */
    @Mock
    private cm.cositi.api.adherent.repository.DemandeChangementAllocationRepository demandeChangementAllocationRepository;

    private ServiceAdherentImpl service;
    private Utilisateur auteur;

    @BeforeEach
    void setUp() throws Exception {
        service = new ServiceAdherentImpl(adherentRepository, adhesionRepository, packRepository, serviceMatricule,
                serviceDoublonAdherent, perimetre, serviceAudit, zoneRepository, preferenceAllocationRepository,
                serviceParametre, jdbcTemplate, demandeChangementAllocationRepository);
        auteur = new Utilisateur("agent1", "hash", "Agent Un");
        setId(auteur, UUID.randomUUID());
    }

    private void setId(Object entite, UUID id) throws Exception {
        Field champ = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
        champ.setAccessible(true);
        champ.set(entite, id);
    }

    private CreationAdherentDto dtoValide(boolean confirmationDoublonIgnore) {
        return new CreationAdherentDto("Nguemo", "Paul", null, "M", "677123456", null, null, null,
                UUID.randomUUID(), UUID.randomUUID(), null, "Marché central", null, null, null, null,
                java.time.LocalDate.now(), UUID.randomUUID(), confirmationDoublonIgnore, true);
    }

    private Pack packActif() {
        Pack p = mock(Pack.class);
        when(p.isActif()).thenReturn(true);
        return p;
    }

    @Test
    void creerLeveConflitSiDoublonDetecteSansConfirmation() {
        Pack pack = packActif();
        when(packRepository.findById(any())).thenReturn(Optional.of(pack));
        when(serviceDoublonAdherent.rechercher(any())).thenReturn(
                List.of(new CandidatDoublon(UUID.randomUUID(), "COSITI-00001", "Nguemo Paul", "6••••• 456", 95,
                        "Téléphone principal identique")));

        assertThatThrownBy(() -> service.creer(dtoValide(false), auteur))
                .isInstanceOf(ExceptionDoublonPotentiel.class);

        verify(adherentRepository, times(0)).save(any());
    }

    @Test
    void creerReussitEtAuditeLeChoixSiDoublonConfirmeIgnore() {
        Pack pack = packActif();
        when(packRepository.findById(any())).thenReturn(Optional.of(pack));
        when(serviceDoublonAdherent.rechercher(any())).thenReturn(
                List.of(new CandidatDoublon(UUID.randomUUID(), "COSITI-00001", "Nguemo Paul", "6••••• 456", 95,
                        "Téléphone principal identique")));
        when(serviceMatricule.genererProchain()).thenReturn("COSITI-00042");
        when(adherentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(adhesionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var resultat = service.creer(dtoValide(true), auteur);

        assertThat(resultat.matricule()).isEqualTo("COSITI-00042");
        verify(serviceAudit, times(1)).tracer(eq(cm.cositi.api.audit.TypeOperation.ADHERENT_DOUBLON_IGNORE),
                any(), any(), any(), any(), any());
    }

    @Test
    void creerRefuseSiPackInactifOuIntrouvable() {
        when(packRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.creer(dtoValide(true), auteur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "ADHERENT_PACK_INVALIDE");
    }

    @Test
    void changerStatutRefuseDepuisRadie() throws Exception {
        Adherent adherent = new Adherent("COSITI-00001", "Nguemo", "677000000", UUID.randomUUID(), UUID.randomUUID(),
                "loc", java.time.LocalDate.now());
        adherent.setStatut(StatutAdherent.RADIE);
        setId(adherent, UUID.randomUUID());
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        doNothing().when(perimetre).verifierAccesAdherent(any(), any());

        assertThatThrownBy(() -> service.changerStatut(adherent.getId(), StatutAdherent.ACTIF, "motif", auteur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "ADHERENT_STATUT_TERMINAL");
    }

    @Test
    void changerStatutExigeUnMotif() {
        assertThatThrownBy(() -> service.changerStatut(UUID.randomUUID(), StatutAdherent.ACTIF, "  ", auteur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "ADHERENT_MOTIF_REQUIS");
    }

    @Test
    void consulterVerifieLePerimetreAvantDeRenvoyerLaFiche() throws Exception {
        Adherent adherent = new Adherent("COSITI-00002", "Fotso", "677000001", UUID.randomUUID(), UUID.randomUUID(),
                "loc", java.time.LocalDate.now());
        UUID id = UUID.randomUUID();
        setId(adherent, id);
        doThrow(new cm.cositi.api.commun.exception.ExceptionAutorisation("PERIMETRE_ADHERENT_REFUSE", "hors périmètre"))
                .when(perimetre).verifierAccesAdherent(auteur, id);

        assertThatThrownBy(() -> service.consulter(id, auteur))
                .isInstanceOf(cm.cositi.api.commun.exception.ExceptionAutorisation.class);

        verify(adherentRepository, times(0)).findById(id);
    }

    @Test
    void consulterLeveRessourceIntrouvableSiAbsent() {
        UUID id = UUID.randomUUID();
        doNothing().when(perimetre).verifierAccesAdherent(any(), any());
        when(adherentRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.consulter(id, auteur))
                .isInstanceOf(ExceptionRessourceIntrouvable.class);
    }
}
