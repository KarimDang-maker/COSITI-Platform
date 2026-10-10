package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.dto.CompleterProfilAdherentDto;
import cm.cositi.api.adherent.dto.CreationAdherentDto;
import cm.cositi.api.adherent.dto.ModifierCoordonneesDto;
import cm.cositi.api.adherent.dto.ModifierProfessionnelDto;
import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.repository.AdhesionRepository;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.PackRepository;
import cm.cositi.api.adherent.exception.ExceptionDoublonPotentiel;
import cm.cositi.api.audit.JournalAuditRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.document.dto.DocumentDto;
import cm.cositi.api.document.entite.TypeDocument;
import cm.cositi.api.document.service.ServiceStockageDocument;
import cm.cositi.api.organisation.repository.AffectationPortefeuilleRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

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
    @Mock
    private AffectationPortefeuilleRepository affectationPortefeuilleRepository;
    @Mock
    private ServiceStockageDocument serviceStockageDocument;
    @Mock
    private JournalAuditRepository journalAuditRepository;
    @Mock
    private ServiceParametre serviceParametre;
    @Mock
    private ApplicationEventPublisher publicateurEvenements;
    @Mock
    private cm.cositi.api.adhesion.service.ServiceExigenceDocumentaire serviceExigence;

    private ServiceAdherentImpl service;
    private Utilisateur auteur;

    @BeforeEach
    void setUp() throws Exception {
        service = new ServiceAdherentImpl(adherentRepository, adhesionRepository, packRepository, serviceMatricule,
                serviceDoublonAdherent, perimetre, serviceAudit, zoneRepository, affectationPortefeuilleRepository,
                serviceStockageDocument, journalAuditRepository, serviceParametre, publicateurEvenements,
                serviceExigence);
        auteur = new Utilisateur("agent1", "hash", "Agent Un");
        setId(auteur, UUID.randomUUID());
    }

    private Adherent adherentPourTests() throws Exception {
        Adherent adherent = new Adherent("COSITI-00099", "Ateba", "677999999", UUID.randomUUID(), UUID.randomUUID(),
                "loc", java.time.LocalDate.now());
        setId(adherent, UUID.randomUUID());
        return adherent;
    }

    private void setId(Object entite, UUID id) throws Exception {
        Field champ = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
        champ.setAccessible(true);
        champ.set(entite, id);
    }

    private CreationAdherentDto dtoValide(boolean confirmationDoublonIgnore) {
        // V23 : ni zone ni localisation (formulaire allégé) ; quartier et ville conservés.
        return new CreationAdherentDto("Nguemo", "Paul", null, "M", "677123456", null, "677123456",
                " Paul.Nguemo@Exemple.cm ", null, null, UUID.randomUUID(), null, null, null,
                "Akwa", "Douala", java.time.LocalDate.now(), confirmationDoublonIgnore, true);
    }

    @Test
    void creerLeveConflitSiDoublonDetecteSansConfirmation() {
        when(serviceDoublonAdherent.rechercher(any())).thenReturn(
                List.of(new CandidatDoublon(UUID.randomUUID(), "COSITI-00001", "Nguemo Paul", "6••••• 456", 95,
                        "Téléphone principal identique")));

        assertThatThrownBy(() -> service.creer(dtoValide(false), auteur))
                .isInstanceOf(ExceptionDoublonPotentiel.class);

        verify(adherentRepository, times(0)).save(any());
    }

    @Test
    void creerReussitEtAuditeLeChoixSiDoublonConfirmeIgnore() {
        when(serviceDoublonAdherent.rechercher(any())).thenReturn(
                List.of(new CandidatDoublon(UUID.randomUUID(), "COSITI-00001", "Nguemo Paul", "6••••• 456", 95,
                        "Téléphone principal identique")));
        when(serviceMatricule.genererProchain()).thenReturn("COSITI-00042");
        when(adherentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var resultat = service.creer(dtoValide(true), auteur);

        assertThat(resultat.matricule()).isEqualTo("COSITI-00042");
        verify(serviceAudit, times(1)).tracer(eq(cm.cositi.api.audit.TypeOperation.ADHERENT_DOUBLON_IGNORE),
                any(), any(), any(), any(), any());
    }

    /** Règles module 1 §7 : la création ne demande plus de pack et n'ouvre aucune adhésion. */
    @Test
    void creerSansPackNOuvreAucuneAdhesionEtEnregistreLesCoordonnees() {
        when(serviceDoublonAdherent.rechercher(any())).thenReturn(List.of());
        when(serviceMatricule.genererProchain()).thenReturn("COSITI-00043");
        when(adherentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var resultat = service.creer(dtoValide(false), auteur);

        assertThat(resultat.matricule()).isEqualTo("COSITI-00043");
        assertThat(resultat.whatsapp()).isEqualTo("677123456");
        assertThat(resultat.email()).isEqualTo("paul.nguemo@exemple.cm");
        verify(adhesionRepository, times(0)).save(any());
        verify(packRepository, times(0)).findById(any());
        verify(serviceAudit).tracer(eq(cm.cositi.api.audit.TypeOperation.ADHERENT_CREATION), eq("adherent"), any(),
                any(), any(), any());
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

    @Test
    void consulterParMatriculeLeveRessourceIntrouvableSiAbsent() {
        when(adherentRepository.findByMatricule("COSITI-99999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.consulterParMatricule("COSITI-99999", auteur))
                .isInstanceOf(ExceptionRessourceIntrouvable.class);

        verify(perimetre, times(0)).verifierAccesAdherent(any(), any());
    }

    @Test
    void completionCompteLesChampsRenseignesSelonLeParametre() throws Exception {
        Adherent adherent = adherentPourTests();
        adherent.setNumeroCni("123456");
        // sexe, téléphone secondaire, etc. restent nuls.
        doNothing().when(perimetre).verifierAccesAdherent(any(), any());
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        when(serviceParametre.texte("CHAMPS_COMPLETION_ADHERENT")).thenReturn("SEXE,NUMERO_CNI");
        when(serviceParametre.estValide("CHAMPS_COMPLETION_ADHERENT")).thenReturn(true);

        var resultat = service.completion(adherent.getId(), auteur);

        assertThat(resultat.champsTotal()).isEqualTo(2);
        assertThat(resultat.champsRenseignes()).isEqualTo(1);
        assertThat(resultat.pourcentage()).isEqualTo(50);
        assertThat(resultat.champsManquants()).extracting("cle").containsExactly("SEXE");
    }

    @Test
    void completerProfilNAppliqueQueLesChampsFournis() throws Exception {
        Adherent adherent = adherentPourTests();
        doNothing().when(perimetre).verifierAccesAdherent(any(), any());
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        when(adherentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var dto = new CompleterProfilAdherentDto(null, "F", null, null, null, null, null, null, null, null, false);
        service.completerProfil(adherent.getId(), dto, auteur);

        assertThat(adherent.getSexe()).isEqualTo("F");
        assertThat(adherent.getNumeroCni()).isNull();
        verify(serviceAudit).tracer(eq(TypeOperation.ADHERENT_COMPLETION_PROFIL), eq("adherent"),
                eq(adherent.getId()), any(), any(), any());
    }

    @Test
    void modifierProfessionnelAuditeEtNeChangeQueLesChampsProfessionnels() throws Exception {
        Adherent adherent = adherentPourTests();
        String telephoneAvant = adherent.getTelephonePrincipal();
        doNothing().when(perimetre).verifierAccesAdherent(any(), any());
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        when(adherentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UUID nouvelleActivite = UUID.randomUUID();
        service.modifierProfessionnel(adherent.getId(),
                new ModifierProfessionnelDto(nouvelleActivite, "CNPS-1", null), auteur);

        assertThat(adherent.getActiviteId()).isEqualTo(nouvelleActivite);
        assertThat(adherent.getNumeroCnps()).isEqualTo("CNPS-1");
        assertThat(adherent.getTelephonePrincipal()).isEqualTo(telephoneAvant);
        verify(serviceAudit).tracer(eq(TypeOperation.ADHERENT_MODIFICATION_PROFESSIONNELLE), any(), any(), any(),
                any(), any());
    }

    @Test
    void modifierCoordonneesAuditeEtChangeLesCoordonnees() throws Exception {
        Adherent adherent = adherentPourTests();
        doNothing().when(perimetre).verifierAccesAdherent(any(), any());
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        when(adherentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.modifierCoordonnees(adherent.getId(),
                new ModifierCoordonneesDto("677111111", null, "677111111", "contact@exemple.cm", null, "Nouveau quartier",
                        null, null),
                auteur);

        assertThat(adherent.getTelephonePrincipal()).isEqualTo("677111111");
        assertThat(adherent.getLocalisation()).isEqualTo("Nouveau quartier");
        assertThat(adherent.getWhatsapp()).isEqualTo("677111111");
        assertThat(adherent.getEmail()).isEqualTo("contact@exemple.cm");
        verify(serviceAudit).tracer(eq(TypeOperation.ADHERENT_MODIFICATION_CONTACT), any(), any(), any(), any(), any());
    }

    @Test
    void documentsManquantsNeRetientQueLesTypesAbsentsOuRejetes() throws Exception {
        Adherent adherent = adherentPourTests();
        doNothing().when(perimetre).verifierAccesAdherent(any(), any());
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        // Matrice documentaire V21 : pièces de niveau OBLIGATOIRE (CNI, formulaire d'adhésion).
        when(serviceExigence.typesPiecesObligatoires()).thenReturn(java.util.Set.of("CNI", "FORMULAIRE_ADHESION"));
        DocumentDto cniRejete = new DocumentDto(UUID.randomUUID(), TypeDocument.CNI, "f.pdf", "application/pdf", 10,
                true, adherent.getId(), null, cm.cositi.api.document.entite.StatutDocument.REJETE,
                cm.cositi.api.document.entite.AnalyseAntivirus.PROPRE, false, java.time.Instant.now(), "agent1",
                1, null, null, null, null, false, null, null, null);
        when(serviceStockageDocument.listerParAdherent(adherent.getId(), auteur)).thenReturn(List.of(cniRejete));

        List<TypeDocument> manquants = service.documentsManquants(adherent.getId(), auteur);

        assertThat(manquants).containsExactlyInAnyOrder(TypeDocument.CNI, TypeDocument.FORMULAIRE_ADHESION);
    }

    @Test
    void historiqueVerifieLePerimetreAvantDeLireLeJournal() {
        UUID id = UUID.randomUUID();
        doThrow(new cm.cositi.api.commun.exception.ExceptionAutorisation("PERIMETRE_ADHERENT_REFUSE", "hors périmètre"))
                .when(perimetre).verifierAccesAdherent(auteur, id);

        assertThatThrownBy(() -> service.historique(id, auteur))
                .isInstanceOf(cm.cositi.api.commun.exception.ExceptionAutorisation.class);

        verify(journalAuditRepository, times(0)).findAll(any(org.springframework.data.jpa.domain.Specification.class),
                any(org.springframework.data.domain.Sort.class));
    }

    // ------------------------------------------------------------------ Workflow V19 : routes directes protégées

    private Adherent adherentAvecStatutValidation(cm.cositi.api.workflow.entite.StatutValidationEntite statut)
            throws Exception {
        Adherent adherent = new Adherent("COSITI-00077", "Essomba", "677000077", UUID.randomUUID(), UUID.randomUUID(),
                "loc", java.time.LocalDate.now());
        setId(adherent, UUID.randomUUID());
        adherent.setStatutValidation(statut);
        adherent.setVille("Yaoundé");
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        doNothing().when(perimetre).verifierAccesAdherent(any(), any());
        return adherent;
    }

    @Test
    void modifierCoordonneesRefuseUnDossierValide() throws Exception {
        Adherent adherent = adherentAvecStatutValidation(cm.cositi.api.workflow.entite.StatutValidationEntite.VALIDE);
        var dto = new ModifierCoordonneesDto("699000000", null, null, null, null, "Nouvelle adresse", null, null);

        assertThatThrownBy(() -> service.modifierCoordonnees(adherent.getId(), dto, auteur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "ADHERENT_MODIFICATION_PAR_DEMANDE");
        verify(adherentRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void modifierProfessionnelRefuseUnDossierEnCoursDeValidation() throws Exception {
        Adherent adherent = adherentAvecStatutValidation(
                cm.cositi.api.workflow.entite.StatutValidationEntite.EN_ATTENTE_VALIDATION);

        assertThatThrownBy(() -> service.modifierProfessionnel(adherent.getId(),
                new ModifierProfessionnelDto(null, "CNPS-1", null), auteur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "ADHERENT_EN_VALIDATION");
    }

    @Test
    void changerStatutRefuseUnDossierValide() throws Exception {
        Adherent adherent = adherentAvecStatutValidation(cm.cositi.api.workflow.entite.StatutValidationEntite.VALIDE);

        assertThatThrownBy(() -> service.changerStatut(adherent.getId(), StatutAdherent.INACTIF, "motif", auteur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "ADHERENT_MODIFICATION_PAR_DEMANDE");
    }

    @Test
    void completerProfilDUnDossierValideNeRemplacePasUneValeurOfficielle() throws Exception {
        Adherent adherent = adherentAvecStatutValidation(cm.cositi.api.workflow.entite.StatutValidationEntite.VALIDE);
        var remplacement = new CompleterProfilAdherentDto(null, null, null, null, null, null, null, null, null, "Douala",
                false);

        assertThatThrownBy(() -> service.completerProfil(adherent.getId(), remplacement, auteur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "ADHERENT_MODIFICATION_PAR_DEMANDE");
    }

    @Test
    void completerProfilDUnDossierValideRemplitUnChampVide() throws Exception {
        Adherent adherent = adherentAvecStatutValidation(cm.cositi.api.workflow.entite.StatutValidationEntite.VALIDE);
        when(adherentRepository.save(any(Adherent.class))).thenAnswer(i -> i.getArgument(0));
        var ajout = new CompleterProfilAdherentDto(null, null, null, null, null, null, null, null, "Mvog-Ada", null,
                false);

        var resultat = service.completerProfil(adherent.getId(), ajout, auteur);

        org.assertj.core.api.Assertions.assertThat(resultat.quartier()).isEqualTo("Mvog-Ada");
    }
}
