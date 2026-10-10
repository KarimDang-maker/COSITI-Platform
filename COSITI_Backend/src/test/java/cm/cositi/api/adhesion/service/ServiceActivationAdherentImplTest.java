package cm.cositi.api.adhesion.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.entite.StatutControleDga;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.service.CandidatDoublon;
import cm.cositi.api.adherent.service.ServiceAdherent;
import cm.cositi.api.adherent.service.ServiceDoublonAdherent;
import cm.cositi.api.adhesion.dto.ActivationAdherentDto;
import cm.cositi.api.adhesion.dto.ChecklistDocumentaireDto;
import cm.cositi.api.adhesion.dto.ControleDgaDto;
import cm.cositi.api.adhesion.entite.NiveauExigence;
import cm.cositi.api.adhesion.entite.StatutPiece;
import cm.cositi.api.adhesion.entite.ControleDga;
import cm.cositi.api.adhesion.entite.FraisAdhesion;
import cm.cositi.api.adhesion.entite.StatutControle;
import cm.cositi.api.adhesion.repository.ControleDgaRepository;
import cm.cositi.api.adhesion.repository.FraisAdhesionRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.entite.EntiteAuditable;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import cm.cositi.api.workflow.entite.StatutValidationEntite;
import cm.cositi.api.workflow.repository.DemandeValidationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceActivationAdherentImplTest {

    @Mock
    private AdherentRepository adherentRepository;
    @Mock
    private FraisAdhesionRepository fraisRepository;
    @Mock
    private ControleDgaRepository controleRepository;
    @Mock
    private DemandeValidationRepository demandeValidationRepository;
    @Mock
    private ServiceAdherent serviceAdherent;
    @Mock
    private ServiceDoublonAdherent serviceDoublonAdherent;
    @Mock
    private ServiceFraisAdhesion serviceFraisAdhesion;
    @Mock
    private ServiceControleDga serviceControleDga;
    @Mock
    private ServiceExigenceDocumentaire serviceExigence;
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

    private ServiceActivationAdherentImpl service;
    private Adherent adherent;
    private Utilisateur gestionnaire;

    @BeforeEach
    void setUp() {
        service = new ServiceActivationAdherentImpl(adherentRepository, fraisRepository, controleRepository,
                demandeValidationRepository, serviceAdherent, serviceDoublonAdherent, serviceFraisAdhesion,
                serviceControleDga, serviceExigence, perimetre, serviceParametre, serviceAudit, evenements, jdbcTemplate);
        adherent = new Adherent("COSITI-00600", "Mbog", "677600600", UUID.randomUUID(), UUID.randomUUID(), "Marché",
                LocalDate.now().minusDays(2));
        fixerId(adherent, UUID.randomUUID());
        gestionnaire = mock(Utilisateur.class);
        UUID idGestionnaire = UUID.randomUUID();
        lenient().when(gestionnaire.getId()).thenReturn(idGestionnaire);
        lenient().when(gestionnaire.getIdentifiant()).thenReturn("gest");

        lenient().when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        lenient().when(adherentRepository.saveAndFlush(any(Adherent.class))).thenAnswer(i -> i.getArgument(0));
        lenient().when(serviceParametre.booleen(any())).thenReturn(true);
        lenient().when(serviceParametre.estValide(any())).thenReturn(false);
        lenient().when(serviceFraisAdhesion.montantUnitaire()).thenReturn(new BigDecimal("1000"));
        lenient().when(serviceAdherent.documentsManquants(any(), any())).thenReturn(List.of());
        lenient().when(serviceDoublonAdherent.rechercher(any())).thenReturn(List.of());
        lenient().when(serviceControleDga.ouvrir(any(), any())).thenAnswer(i -> controle(1));
        lenient().when(serviceExigence.checklist(any(), any())).thenAnswer(i -> checklist());
    }

    private ChecklistDocumentaireDto checklist(ChecklistDocumentaireDto.Piece... pieces) {
        return new ChecklistDocumentaireDto(adherent.getId(), adherent.getMatricule(), List.of(pieces),
                new ChecklistDocumentaireDto.Compteurs(pieces.length, 0, 0, 0, 0, 0), true, List.of());
    }

    private static ChecklistDocumentaireDto.Piece piece(String libelle, boolean bloquante, StatutPiece statut) {
        return new ChecklistDocumentaireDto.Piece(UUID.randomUUID(), "IDENTITE_PIECE", "IDENTITE", "CNI", libelle,
                NiveauExigence.OBLIGATOIRE, bloquante ? "C" : "V", bloquante, true, null, statut, null, null, null, List.of());
    }

    private void avecFrais() {
        FraisAdhesion frais = new FraisAdhesion("FAD-000001", adherent.getId(), UUID.randomUUID(), new BigDecimal("1000"),
                new BigDecimal("1000"), LocalDate.now(), UUID.randomUUID(), null, null);
        when(fraisRepository.findByAdherentIdAndTypeFrais(adherent.getId(), "ADHESION")).thenReturn(Optional.of(frais));
    }

    @Test
    void activationRefuseeSansFraisDAdhesion() {
        assertThatThrownBy(() -> service.activer(adherent.getId(), null, gestionnaire))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "ADHERENT_ACTIVATION_CONDITIONS_NON_REMPLIES")
                .hasMessageContaining("Frais d'adhésion");
        verify(serviceControleDga, never()).ouvrir(any(), any());
    }

    @Test
    void activationRefuseeSiUnePieceObligatoireConfirmeeManque() {
        avecFrais();
        when(serviceExigence.checklist(any(), any())).thenReturn(checklist(piece("CNI", true, StatutPiece.REQUIS)));

        assertThatThrownBy(() -> service.activer(adherent.getId(), null, gestionnaire))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("CNI");
    }

    @Test
    void unePieceObligatoireNonConfirmeeEstSignaleeSansBloquer() {
        avecFrais();
        when(serviceExigence.checklist(any(), any())).thenReturn(checklist(piece("CNI", false, StatutPiece.REQUIS)));

        var verification = service.verifier(adherent.getId(), gestionnaire);

        var documents = verification.conditions().stream().filter(c -> c.code().equals("DOCUMENTS")).findFirst().orElseThrow();
        assertThat(documents.satisfaite()).isTrue();
        assertThat(documents.detail()).contains("obligation non confirmée");
    }

    @Test
    void unePieceNonConformeBloqueMemeSiElleEstFournie() {
        avecFrais();
        when(serviceExigence.checklist(any(), any())).thenReturn(checklist(piece("CNI", true, StatutPiece.NON_CONFORME)));

        assertThatThrownBy(() -> service.activer(adherent.getId(), null, gestionnaire))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("NON_CONFORME");
    }

    @Test
    void activationRendLeCompteActifEtTransmetALaDga() {
        avecFrais();

        var resultat = service.activer(adherent.getId(), null, gestionnaire);

        assertThat(adherent.getStatut()).isEqualTo(StatutAdherent.ACTIF);
        assertThat(adherent.getActivePar()).isEqualTo(gestionnaire.getId());
        assertThat(adherent.getStatutControleDga()).isEqualTo(StatutControleDga.EN_ATTENTE_DGA);
        assertThat(adherent.getPremiereSoumissionDgaLe()).isNotNull();
        assertThat(adherent.getStatutValidation()).isEqualTo(StatutValidationEntite.EN_ATTENTE_VALIDATION);
        assertThat(resultat.dejaActive()).isFalse();
        verify(serviceControleDga).ouvrir(adherent, gestionnaire.getId());
        verify(serviceAudit).tracer(eq(TypeOperation.ADHERENT_ACTIVATION), eq("adherent"), eq(adherent.getId()), any(),
                any(), any());
        verify(serviceAudit).tracer(eq(TypeOperation.ADHERENT_SOUMISSION_DGA), eq("adherent"), eq(adherent.getId()), any(),
                any(), any());
        verify(evenements).publishEvent(any(AdhesionEvent.class));
    }

    @Test
    void uneDoubleActivationNeFaitRien() {
        adherent.activer(UUID.randomUUID());

        var resultat = service.activer(adherent.getId(), null, gestionnaire);

        assertThat(resultat.dejaActive()).isTrue();
        verify(serviceControleDga, never()).ouvrir(any(), any());
        verify(serviceAudit, never()).tracer(any(), any(), any(), any(), any(), any());
    }

    @Test
    void unDoublonPotentielBloqueSaufConfirmation() {
        avecFrais();
        when(serviceDoublonAdherent.rechercher(any())).thenReturn(List.of(new CandidatDoublon(UUID.randomUUID(),
                "COSITI-00999", "Mbog", "677600600", 90, "TELEPHONE")));

        assertThatThrownBy(() -> service.activer(adherent.getId(), null, gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "ADHERENT_DOUBLON_POTENTIEL");

        var resultat = service.activer(adherent.getId(), new ActivationAdherentDto(null, true), gestionnaire);
        assertThat(adherent.getStatut()).isEqualTo(StatutAdherent.ACTIF);
        assertThat(resultat.statutControleDga()).isEqualTo(StatutControleDga.EN_ATTENTE_DGA);
    }

    @Test
    void uneVersionObsoleteEstRefusee() {
        assertThatThrownBy(() -> service.activer(adherent.getId(), new ActivationAdherentDto(99L, false), gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "ADHERENT_VERSION_OBSOLETE");
    }

    @Test
    void laResoumissionApresCorrectionNeRecomptePasLAdherent() throws Exception {
        adherent.activer(gestionnaire.getId());
        adherent.marquerSoumisDga();
        Instant premiere = adherent.getPremiereSoumissionDgaLe();
        adherent.setStatutControleDga(StatutControleDga.CORRECTION_DEMANDEE);
        adherent.setStatutValidation(StatutValidationEntite.CORRECTION_DEMANDEE);
        ControleDgaDto tour2 = controle(2);
        when(serviceControleDga.ouvrir(any(), any())).thenReturn(tour2);
        Thread.sleep(5);

        ControleDgaDto controle = service.soumettreDga(adherent.getId(), null, gestionnaire);

        assertThat(controle.tour()).isEqualTo(2);
        assertThat(adherent.getPremiereSoumissionDgaLe()).isEqualTo(premiere);
        assertThat(adherent.getDerniereSoumissionDgaLe()).isAfter(premiere);
        assertThat(adherent.getStatutControleDga()).isEqualTo(StatutControleDga.EN_ATTENTE_DGA);
    }

    @Test
    void unDossierDejaEnFileNEstPasTransmisDeuxFois() {
        adherent.activer(gestionnaire.getId());
        ControleDga ouvert = new ControleDga("CDG-000001", adherent.getId(), 1, null, gestionnaire.getId());
        fixerId(ouvert, UUID.randomUUID());
        when(controleRepository.findFirstByAdherentIdAndStatutIn(eq(adherent.getId()), any()))
                .thenReturn(Optional.of(ouvert));
        ControleDgaDto tour1 = controle(1);
        when(serviceControleDga.consulter(ouvert.getId(), gestionnaire)).thenReturn(tour1);

        service.soumettreDga(adherent.getId(), null, gestionnaire);

        verify(serviceControleDga, never()).ouvrir(any(), any());
    }

    @Test
    void unAdherentNonActiveNEstPasTransmis() {
        assertThatThrownBy(() -> service.soumettreDga(adherent.getId(), null, gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "ADHERENT_NON_ACTIF");
    }

    @Test
    void unDossierDejaOfficielResteValideDuranteLeControle() {
        avecFrais();
        adherent.setStatutValidation(StatutValidationEntite.VALIDE);

        service.activer(adherent.getId(), null, gestionnaire);

        assertThat(adherent.getStatutValidation()).isEqualTo(StatutValidationEntite.VALIDE);
        assertThat(adherent.getStatutControleDga()).isEqualTo(StatutControleDga.EN_ATTENTE_DGA);
    }

    private ControleDgaDto controle(int tour) {
        return new ControleDgaDto(UUID.randomUUID(), "CDG-00000" + tour, adherent.getId(), adherent.getMatricule(), "Mbog",
                tour, null, StatutControle.EN_ATTENTE, gestionnaire.getId(), Instant.now(), null, null, null, null, null,
                new ControleDgaDto.Compteurs(0, 0, 0, 0, 0, 0, 0, 0), List.of(), true, List.of(), 0L);
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
