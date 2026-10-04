package cm.cositi.api.workflow.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.commun.entite.EntiteAuditable;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.document.repository.DocumentRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.workflow.dto.CreationDemandeValidationDto;
import cm.cositi.api.workflow.dto.DecisionDemandeDto;
import cm.cositi.api.workflow.dto.DemandeValidationDto;
import cm.cositi.api.workflow.dto.PropositionChampDto;
import cm.cositi.api.workflow.dto.ResoumissionDemandeDto;
import cm.cositi.api.workflow.entite.ActionWorkflow;
import cm.cositi.api.workflow.entite.DecisionDemandeValidation;
import cm.cositi.api.workflow.entite.DemandeValidation;
import cm.cositi.api.workflow.entite.ElementDemandeValidation;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.TypeDonneeChamp;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;
import cm.cositi.api.workflow.repository.DecisionDemandeValidationRepository;
import cm.cositi.api.workflow.repository.DemandeValidationRepository;
import cm.cositi.api.workflow.repository.DocumentDemandeValidationRepository;
import cm.cositi.api.workflow.repository.ElementDemandeValidationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceDemandeValidationImplTest {

    @Mock
    private DemandeValidationRepository demandeRepository;
    @Mock
    private ElementDemandeValidationRepository elementRepository;
    @Mock
    private DocumentDemandeValidationRepository documentDemandeRepository;
    @Mock
    private DecisionDemandeValidationRepository decisionRepository;
    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private AdaptateurWorkflow adaptateurAdherent;
    @Mock
    private AdaptateurWorkflow adaptateurPaiement;
    @Mock
    private ServiceParametre serviceParametre;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private ApplicationEventPublisher evenements;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private ServiceDemandeValidationImpl service;
    private final UUID entiteId = UUID.randomUUID();
    private Utilisateur gestionnaire;
    private Utilisateur validateur;

    @BeforeEach
    void setUp() {
        when(adaptateurAdherent.typeEntite()).thenReturn(TypeEntiteWorkflow.ADHERENT);
        when(adaptateurPaiement.typeEntite()).thenReturn(TypeEntiteWorkflow.PAIEMENT);
        service = new ServiceDemandeValidationImpl(demandeRepository, elementRepository, documentDemandeRepository,
                decisionRepository, documentRepository, List.of(adaptateurAdherent, adaptateurPaiement),
                new ServicePolitiqueValidation(jdbcTemplate), new ServiceComparaisonValidation(), serviceParametre,
                serviceAudit, evenements, jdbcTemplate);

        gestionnaire = utilisateur("ADHERENT:LIRE", "ADHERENT:MODIFIER", "ADHERENT:VALIDER");
        validateur = utilisateur("ADHERENT:LIRE", "ADHERENT:VALIDER", "PAIEMENT:LIRE", "PAIEMENT:VALIDER");

        Map<String, TypeDonneeChamp> champs = new LinkedHashMap<>();
        champs.put("nom", TypeDonneeChamp.TEXTE);
        champs.put("telephonePrincipal", TypeDonneeChamp.TEXTE);
        lenient().when(adaptateurAdherent.champs(any())).thenReturn(champs);
        lenient().when(adaptateurAdherent.etat(eq(entiteId), any(Boolean.class)))
                .thenReturn(new EtatEntite(3L, Map.of("nom", "Mballa", "telephonePrincipal", "677000000"), "VALIDE", false));
        lenient().when(adaptateurAdherent.peutAcceder(any(), any())).thenReturn(true);
        lenient().when(adaptateurPaiement.peutAcceder(any(), any())).thenReturn(true);
        lenient().when(demandeRepository.saveAndFlush(any(DemandeValidation.class))).thenAnswer(i -> {
            DemandeValidation d = i.getArgument(0);
            if (d.getId() == null) {
                fixerId(d, UUID.randomUUID());
            }
            return d;
        });
        lenient().when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(7L);
        lenient().when(jdbcTemplate.queryForList(anyString(), eq(String.class), any())).thenReturn(List.of("DGA"));
        lenient().when(serviceParametre.json(anyString(), eq(Map.class))).thenReturn(Map.of());
    }

    // ------------------------------------------------------------------------------------------ Création

    @Test
    void creerRefuseSansPermissionDeDemande() {
        Utilisateur lecteur = utilisateur("ADHERENT:LIRE");

        assertThatThrownBy(() -> service.creer(modification("Nkoa"), lecteur))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_PERMISSION_INSUFFISANTE");
    }

    @Test
    void creerRefuseUneSecondeDemandeOuverte() {
        when(demandeRepository.existsByTypeEntiteAndEntiteIdAndStatutIn(eq(TypeEntiteWorkflow.ADHERENT), eq(entiteId), any()))
                .thenReturn(true);

        assertThatThrownBy(() -> service.creer(modification("Nkoa"), gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_ACTIVE_EXISTANTE");
    }

    @Test
    void creerRefuseUneVersionDeBaseObsolete() {
        var dto = new CreationDemandeValidationDto(TypeOperationWorkflow.ADHERENT_MODIFICATION, entiteId, "Erreur de saisie",
                List.of(new PropositionChampDto("nom", "Nkoa", null)), null, 2L, null, false);

        assertThatThrownBy(() -> service.creer(dto, gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_VERSION_OBSOLETE");
    }

    @Test
    void creerRefuseUneDemandeSansChangementReel() {
        assertThatThrownBy(() -> service.creer(modification("  Mballa "), gestionnaire))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_AUCUN_CHANGEMENT");
    }

    @Test
    void creerRefuseUnChampNonModifiable() {
        var dto = new CreationDemandeValidationDto(TypeOperationWorkflow.ADHERENT_MODIFICATION, entiteId, "Motif",
                List.of(new PropositionChampDto("matricule", "X", null)), null, null, null, false);

        assertThatThrownBy(() -> service.creer(dto, gestionnaire))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_CHAMP_NON_MODIFIABLE");
    }

    @Test
    void creerEtSoumettreConserveAncienneEtNouvelleValeurEtPrevientLesValidateurs() {
        var dto = new CreationDemandeValidationDto(TypeOperationWorkflow.ADHERENT_MODIFICATION, entiteId,
                "Nom mal orthographié", List.of(new PropositionChampDto("nom", "Nkoa", "CNI jointe")), null, 3L, null, true);

        DemandeValidationDto resultat = service.creer(dto, gestionnaire);

        assertThat(resultat.statut()).isEqualTo(StatutDemandeValidation.EN_ATTENTE_VALIDATION);
        assertThat(resultat.reference()).matches("DV-\\d{4}-000007");
        verify(elementRepository).save(org.mockito.ArgumentMatchers.argThat(e ->
                e.getChamp().equals("nom") && "Mballa".equals(e.getAncienneValeur()) && "Nkoa".equals(e.getValeurProposee())));
        verify(adaptateurAdherent).controlerPropositions(eq(entiteId), eq(TypeOperationWorkflow.ADHERENT_MODIFICATION),
                any(), eq(Map.of("nom", "Nkoa")));
        verify(evenements, times(1)).publishEvent(any(DemandeValidationEvent.class));
    }

    // ------------------------------------------------------------------------------------------ Décisions

    @Test
    void approuverRefuseLAutoValidation() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.ADHERENT_MODIFICATION, gestionnaire);

        assertThatThrownBy(() -> service.approuver(demande.getId(), DecisionDemandeDto.vide(), gestionnaire))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_AUTO_VALIDATION_INTERDITE");
        verify(adaptateurAdherent, never()).appliquer(any(), any(), any());
    }

    @Test
    void approuverRefuseSansPermissionDeValidation() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.ADHERENT_MODIFICATION, gestionnaire);
        Utilisateur agent = utilisateur("ADHERENT:LIRE", "ADHERENT:MODIFIER");

        assertThatThrownBy(() -> service.approuver(demande.getId(), DecisionDemandeDto.vide(), agent))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_VALIDATION_NON_AUTORISEE");
    }

    @Test
    void approuverUneCorrectionFinanciereExigeLeRoleDaf() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.PAIEMENT_CORRECTION, gestionnaire);

        assertThatThrownBy(() -> service.approuver(demande.getId(), DecisionDemandeDto.vide(), validateur))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasFieldOrPropertyWithValue("code", "VALIDATION_FINANCIERE_NON_AUTORISEE");
    }

    @Test
    void approuverRefuseSiLaDonneeAChangeDepuisLaDemande() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.ADHERENT_MODIFICATION, gestionnaire);
        when(adaptateurAdherent.etat(entiteId, true))
                .thenReturn(new EtatEntite(4L, Map.of("nom", "Mballa"), "VALIDE", false));

        assertThatThrownBy(() -> service.approuver(demande.getId(), DecisionDemandeDto.vide(), validateur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_VERSION_OBSOLETE");
        verify(adaptateurAdherent, never()).appliquer(any(), any(), any());
    }

    @Test
    void approuverAppliqueLaDemandeEtTrace() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.ADHERENT_MODIFICATION, gestionnaire);
        ElementDemandeValidation element = new ElementDemandeValidation(demande.getId(), "nom", TypeDonneeChamp.TEXTE,
                "Mballa", "Nkoa", null);
        when(elementRepository.findByDemandeIdOrderByChamp(demande.getId())).thenReturn(List.of(element));
        when(adaptateurAdherent.appliquer(any(), any(), any())).thenReturn(List.of("info"));

        DemandeValidationDto resultat = service.approuver(demande.getId(),
                new DecisionDemandeDto("Conforme à la CNI", "cle-approbation", false), validateur);

        assertThat(resultat.statut()).isEqualTo(StatutDemandeValidation.APPROUVEE);
        assertThat(resultat.examineePar()).isEqualTo(validateur.getId());
        assertThat(resultat.appliqueeLe()).isNotNull();
        assertThat(resultat.avertissements()).containsExactly("info");
        verify(adaptateurAdherent).appliquer(eq(demande), eq(List.of(element)), eq(validateur));
        verify(decisionRepository).save(org.mockito.ArgumentMatchers.argThat(d ->
                d.getAction() == ActionWorkflow.APPROBATION && "cle-approbation".equals(d.getCleIdempotence())));
    }

    @Test
    void approuverRejoueSansReappliquerAvecLaMemeCle() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.ADHERENT_MODIFICATION, gestionnaire);
        UUID validateurId = validateur.getId();
        demande.decider(StatutDemandeValidation.APPROUVEE, validateurId, "ok");
        DecisionDemandeValidation dejaEnregistree = new DecisionDemandeValidation(demande.getId(),
                ActionWorkflow.APPROBATION, StatutDemandeValidation.EN_ATTENTE_VALIDATION,
                StatutDemandeValidation.APPROUVEE, validateurId, "daf", "ok", "cle-1");
        when(decisionRepository.findByCleIdempotence("cle-1")).thenReturn(Optional.of(dejaEnregistree));

        DemandeValidationDto resultat = service.approuver(demande.getId(), new DecisionDemandeDto(null, "cle-1", false),
                validateur);

        assertThat(resultat.statut()).isEqualTo(StatutDemandeValidation.APPROUVEE);
        verify(adaptateurAdherent, never()).appliquer(any(), any(), any());
    }

    @Test
    void uneCleDejaUtiliseePourUneAutreActionEstRefusee() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.ADHERENT_MODIFICATION, gestionnaire);
        DecisionDemandeValidation soumission = new DecisionDemandeValidation(demande.getId(), ActionWorkflow.SOUMISSION,
                StatutDemandeValidation.BROUILLON, StatutDemandeValidation.EN_ATTENTE_VALIDATION, gestionnaire.getId(),
                "g", null, "cle-2");
        when(decisionRepository.findByCleIdempotence("cle-2")).thenReturn(Optional.of(soumission));

        assertThatThrownBy(() -> service.approuver(demande.getId(), new DecisionDemandeDto(null, "cle-2", false), validateur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "IDEMPOTENCY_KEY_REUTILISEE");
    }

    @Test
    void approuverRefuseUneDemandeDejaDecidee() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.ADHERENT_MODIFICATION, gestionnaire);
        demande.decider(StatutDemandeValidation.REJETEE, validateur.getId(), "non");

        assertThatThrownBy(() -> service.approuver(demande.getId(), DecisionDemandeDto.vide(), validateur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_TRANSITION_INTERDITE");
    }

    @Test
    void rejeterEtDemanderUneCorrectionExigentUnMotif() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.ADHERENT_MODIFICATION, gestionnaire);

        assertThatThrownBy(() -> service.rejeter(demande.getId(), new DecisionDemandeDto(" ", null, false), validateur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_MOTIF_REQUIS");
        assertThatThrownBy(() -> service.demanderCorrection(demande.getId(), DecisionDemandeDto.vide(), validateur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_MOTIF_REQUIS");
    }

    @Test
    void demanderCorrectionSynchroniseLeDossier() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.ADHERENT_VALIDATION_DOSSIER, gestionnaire);

        DemandeValidationDto resultat = service.demanderCorrection(demande.getId(),
                new DecisionDemandeDto("Photo CNI illisible", null, false), validateur);

        assertThat(resultat.statut()).isEqualTo(StatutDemandeValidation.CORRECTION_DEMANDEE);
        assertThat(resultat.commentaireValidateur()).isEqualTo("Photo CNI illisible");
        verify(adaptateurAdherent).synchroniserStatut(entiteId, TypeOperationWorkflow.ADHERENT_VALIDATION_DOSSIER,
                StatutDemandeValidation.CORRECTION_DEMANDEE);
    }

    @Test
    void seulLeDemandeurPeutResoumettre() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.ADHERENT_MODIFICATION, gestionnaire);
        demande.decider(StatutDemandeValidation.CORRECTION_DEMANDEE, validateur.getId(), "Compléter");

        assertThatThrownBy(() -> service.resoumettre(demande.getId(), new ResoumissionDemandeDto(null, null, null), validateur))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_RESERVEE_DEMANDEUR");
    }

    @Test
    void soumettreRefuseSiUnJustificatifObligatoireManque() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.ADHERENT_MODIFICATION, gestionnaire);
        fixerStatut(demande, StatutDemandeValidation.BROUILLON);
        when(serviceParametre.json(anyString(), eq(Map.class)))
                .thenReturn(Map.of("ADHERENT_MODIFICATION", List.of("CNI")));

        assertThatThrownBy(() -> service.soumettre(demande.getId(), DecisionDemandeDto.vide(), gestionnaire))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "DEMANDE_JUSTIFICATIF_MANQUANT");
    }

    @Test
    void annulerUneValidationDeDossierRemetLeDossierEnBrouillon() {
        DemandeValidation demande = demandeEnAttente(TypeOperationWorkflow.ADHERENT_VALIDATION_DOSSIER, gestionnaire);

        DemandeValidationDto resultat = service.annuler(demande.getId(), DecisionDemandeDto.vide(), gestionnaire);

        assertThat(resultat.statut()).isEqualTo(StatutDemandeValidation.ANNULEE);
        verify(adaptateurAdherent).synchroniserStatut(entiteId, TypeOperationWorkflow.ADHERENT_VALIDATION_DOSSIER,
                StatutDemandeValidation.ANNULEE);
    }

    // ------------------------------------------------------------------------------------------ Outils

    private CreationDemandeValidationDto modification(String nom) {
        return new CreationDemandeValidationDto(TypeOperationWorkflow.ADHERENT_MODIFICATION, entiteId, "Erreur de saisie",
                List.of(new PropositionChampDto("nom", nom, null)), null, null, null, false);
    }

    private DemandeValidation demandeEnAttente(TypeOperationWorkflow operation, Utilisateur demandeur) {
        DemandeValidation demande = new DemandeValidation("DV-2026-000001", operation, entiteId, "Motif", 3L,
                demandeur.getId(), demandeur.getIdentifiant(), null);
        fixerId(demande, UUID.randomUUID());
        demande.soumettre(3L);
        lenient().when(demandeRepository.verrouiller(demande.getId())).thenReturn(Optional.of(demande));
        lenient().when(demandeRepository.findById(demande.getId())).thenReturn(Optional.of(demande));
        return demande;
    }

    private static Utilisateur utilisateur(String... permissions) {
        Utilisateur u = mock(Utilisateur.class);
        lenient().when(u.getId()).thenReturn(UUID.randomUUID());
        lenient().when(u.getIdentifiant()).thenReturn("u-" + UUID.randomUUID());
        lenient().doReturn(Arrays.stream(permissions).map(SimpleGrantedAuthority::new).toList()).when(u).getAuthorities();
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

    private static void fixerStatut(DemandeValidation demande, StatutDemandeValidation statut) {
        try {
            Field champ = DemandeValidation.class.getDeclaredField("statut");
            champ.setAccessible(true);
            champ.set(demande, statut);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
