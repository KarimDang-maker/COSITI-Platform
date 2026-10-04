package cm.cositi.api.adhesion.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.StatutControleDga;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adhesion.dto.DecisionControleDgaDto;
import cm.cositi.api.adhesion.dto.VerifierChampDto;
import cm.cositi.api.adhesion.entite.ControleDga;
import cm.cositi.api.adhesion.entite.ControleDgaChamp;
import cm.cositi.api.adhesion.entite.ControleDgaDocument;
import cm.cositi.api.adhesion.entite.DecisionControleDga;
import cm.cositi.api.adhesion.entite.ExigenceDocumentaire;
import cm.cositi.api.adhesion.entite.NiveauExigence;
import cm.cositi.api.adhesion.entite.StatutControle;
import cm.cositi.api.adhesion.entite.StatutCorrespondance;
import cm.cositi.api.adhesion.repository.ControleDgaChampRepository;
import cm.cositi.api.adhesion.repository.ControleDgaDocumentRepository;
import cm.cositi.api.adhesion.repository.ControleDgaRepository;
import cm.cositi.api.audit.JournalAuditRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.entite.EntiteAuditable;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.document.repository.DocumentRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import cm.cositi.api.workflow.entite.StatutValidationEntite;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceControleDgaImplTest {

    @Mock
    private ControleDgaRepository controleRepository;
    @Mock
    private ControleDgaDocumentRepository documentControleRepository;
    @Mock
    private ControleDgaChampRepository champRepository;
    @Mock
    private AdherentRepository adherentRepository;
    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private JournalAuditRepository journalAuditRepository;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ServiceExigenceDocumentaire serviceExigence;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private ApplicationEventPublisher evenements;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private ServiceControleDgaImpl service;
    private Adherent adherent;
    private Utilisateur gestionnaire;
    private Utilisateur dga;
    private ControleDga controle;
    private ControleDgaDocument cni;
    private ControleDgaChamp nom;
    private ControleDgaChamp naissance;

    @BeforeEach
    void setUp() {
        service = new ServiceControleDgaImpl(controleRepository, documentControleRepository, champRepository,
                adherentRepository, documentRepository, journalAuditRepository, perimetre, serviceExigence,
                serviceAudit, evenements, jdbcTemplate);
        gestionnaire = utilisateur();
        dga = utilisateur();

        adherent = new Adherent("COSITI-00700", "Mbog", "677700700", UUID.randomUUID(), UUID.randomUUID(), "Marché",
                LocalDate.now().minusDays(5));
        fixerId(EntiteAuditable.class, adherent, UUID.randomUUID());
        adherent.setPrenoms("Paul");
        adherent.setDateNaissance(LocalDate.of(1990, 1, 1));
        adherent.activer(gestionnaire.getId());
        adherent.marquerSoumisDga();
        adherent.setStatutValidation(StatutValidationEntite.EN_ATTENTE_VALIDATION);

        controle = new ControleDga("CDG-000001", adherent.getId(), 1, null, gestionnaire.getId());
        fixerId(EntiteAuditable.class, controle, UUID.randomUUID());
        cni = new ControleDgaDocument(controle.getId(), UUID.randomUUID(), "CNI", true);
        fixerId(ControleDgaDocument.class, cni, UUID.randomUUID());
        nom = new ControleDgaChamp(controle.getId(), cni.getId(), "nom", "Nom", "Mbog");
        fixerId(ControleDgaChamp.class, nom, UUID.randomUUID());
        naissance = new ControleDgaChamp(controle.getId(), cni.getId(), "dateNaissance", "Date de naissance", "1990-01-01");
        fixerId(ControleDgaChamp.class, naissance, UUID.randomUUID());

        lenient().when(controleRepository.verrouiller(controle.getId())).thenReturn(Optional.of(controle));
        lenient().when(controleRepository.saveAndFlush(any(ControleDga.class))).thenAnswer(i -> i.getArgument(0));
        lenient().when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        lenient().when(adherentRepository.saveAndFlush(any(Adherent.class))).thenAnswer(i -> i.getArgument(0));
        lenient().when(champRepository.findById(nom.getId())).thenReturn(Optional.of(nom));
        lenient().when(champRepository.findById(naissance.getId())).thenReturn(Optional.of(naissance));
        lenient().when(champRepository.saveAndFlush(any(ControleDgaChamp.class))).thenAnswer(i -> i.getArgument(0));
        lenient().when(champRepository.findByControleId(controle.getId())).thenReturn(List.of(nom, naissance));
        lenient().when(champRepository.findByControleDocumentId(cni.getId())).thenReturn(List.of(nom, naissance));
        lenient().when(documentControleRepository.findById(cni.getId())).thenReturn(Optional.of(cni));
        lenient().when(documentControleRepository.findByControleIdOrderByTypeDocument(controle.getId()))
                .thenReturn(List.of(cni));
    }

    // ------------------------------------------------------------------------------------------ Vérification

    @Test
    void uneNonConcordanceExigeUnMotif() {
        assertThatThrownBy(() -> service.verifierChamp(controle.getId(), naissance.getId(),
                new VerifierChampDto(StatutCorrespondance.NON_CORRESPOND, "1989-01-01", null, null), dga))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "CONTROLE_DGA_MOTIF_REQUIS");
    }

    @Test
    void uneNonConcordanceExigeLaValeurLueSurLeDocument() {
        assertThatThrownBy(() -> service.verifierChamp(controle.getId(), naissance.getId(),
                new VerifierChampDto(StatutCorrespondance.NON_CORRESPOND, null, "Date différente", null), dga))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "CONTROLE_DGA_VALEUR_DOCUMENT_REQUISE");
    }

    @Test
    void celuiQuiAActiveNeControlePas() {
        assertThatThrownBy(() -> service.verifierChamp(controle.getId(), nom.getId(),
                new VerifierChampDto(StatutCorrespondance.CORRESPOND, null, null, null), gestionnaire))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "CONTROLE_DGA_AUTO_CONTROLE_INTERDIT");
    }

    @Test
    void uneConcordanceDemarreLeControleEtEstTracee() {
        service.verifierChamp(controle.getId(), nom.getId(),
                new VerifierChampDto(StatutCorrespondance.CORRESPOND, null, null, null), dga);

        assertThat(controle.getStatut()).isEqualTo(StatutControle.EN_COURS);
        assertThat(adherent.getStatutControleDga()).isEqualTo(StatutControleDga.EN_VERIFICATION);
        assertThat(nom.getValeurPhysique()).isEqualTo("Mbog");
        assertThat(nom.getVerifiePar()).isEqualTo(dga.getId());
        verify(serviceAudit).tracer(eq(TypeOperation.CONTROLE_DGA_CHAMP_VERIFIE), eq("controle_dga"), eq(controle.getId()),
                any(), any(), any());
    }

    @Test
    void uneNonConcordanceEstExpliciteEtMetLeDocumentEnAnomalie() {
        service.verifierChamp(controle.getId(), naissance.getId(),
                new VerifierChampDto(StatutCorrespondance.NON_CORRESPOND, "1989-01-01", "Année différente sur la CNI", null),
                dga);

        assertThat(naissance.getStatutCorrespondance()).isEqualTo(StatutCorrespondance.NON_CORRESPOND);
        assertThat(naissance.getValeurNumerique()).isEqualTo("1990-01-01");
        assertThat(naissance.getValeurPhysique()).isEqualTo("1989-01-01");
        assertThat(cni.getStatut()).isEqualTo(ControleDgaDocument.ANOMALIE);
        verify(serviceAudit).tracer(eq(TypeOperation.CONTROLE_DGA_NON_CONCORDANCE), eq("controle_dga"),
                eq(controle.getId()), any(), any(), eq("Année différente sur la CNI"));
    }

    @Test
    void uneInformationNonApplicableSeRenseigneSansMotif() {
        service.verifierChamp(controle.getId(), naissance.getId(),
                new VerifierChampDto(StatutCorrespondance.NON_APPLICABLE, null, null, null), dga);

        assertThat(naissance.getStatutCorrespondance()).isEqualTo(StatutCorrespondance.NON_APPLICABLE);
        assertThat(cni.getStatut()).isNotEqualTo(ControleDgaDocument.ANOMALIE);
    }

    @Test
    void uneInformationNonLisibleExigeUnMotif() {
        assertThatThrownBy(() -> service.verifierChamp(controle.getId(), naissance.getId(),
                new VerifierChampDto(StatutCorrespondance.NON_LISIBLE, null, null, null), dga))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "CONTROLE_DGA_MOTIF_REQUIS");
    }

    @Test
    void uneVersionObsoleteEstRefusee() {
        assertThatThrownBy(() -> service.verifierChamp(controle.getId(), nom.getId(),
                new VerifierChampDto(StatutCorrespondance.CORRESPOND, null, null, 7L), dga))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "CONTROLE_DGA_VERSION_OBSOLETE");
    }

    // ------------------------------------------------------------------------------------------ Décision

    @Test
    void laValidationExigeQueToutSoitVerifie() {
        nom.verifier(StatutCorrespondance.CORRESPOND, "Mbog", null, dga.getId());

        assertThatThrownBy(() -> service.terminer(controle.getId(),
                new DecisionControleDgaDto(DecisionControleDga.VALIDER, null, null), dga))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "CONTROLE_DGA_CHAMPS_NON_VERIFIES");
    }

    @Test
    void uneAnomalieEmpecheLaValidationFinale() {
        nom.verifier(StatutCorrespondance.CORRESPOND, "Mbog", null, dga.getId());
        naissance.verifier(StatutCorrespondance.NON_CORRESPOND, "1989-01-01", "Différente", dga.getId());

        assertThatThrownBy(() -> service.terminer(controle.getId(),
                new DecisionControleDgaDto(DecisionControleDga.VALIDER, null, null), dga))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "CONTROLE_DGA_ANOMALIES_NON_TRAITEES");
    }

    @Test
    void laValidationRendLeDossierOfficiel() {
        controle.demarrer(dga.getId());
        nom.verifier(StatutCorrespondance.CORRESPOND, "Mbog", null, dga.getId());
        naissance.verifier(StatutCorrespondance.NON_VERIFIABLE, null, "Date partiellement effacée", dga.getId());

        var resultat = service.terminer(controle.getId(),
                new DecisionControleDgaDto(DecisionControleDga.VALIDER, "Conforme", "cle-1"), dga);

        assertThat(resultat.statut()).isEqualTo(StatutControle.VALIDE);
        assertThat(adherent.getStatutControleDga()).isEqualTo(StatutControleDga.VALIDE);
        assertThat(adherent.getStatutValidation()).isEqualTo(StatutValidationEntite.VALIDE);
        verify(serviceAudit).tracer(eq(TypeOperation.CONTROLE_DGA_TERMINE), eq("controle_dga"), eq(controle.getId()),
                any(), any(), eq("Conforme"));
        verify(evenements).publishEvent(any(AdhesionEvent.class));
    }

    @Test
    void uneDemandeDeCorrectionExigeUnMotifEtRouvreLeDossier() {
        controle.demarrer(dga.getId());
        assertThatThrownBy(() -> service.terminer(controle.getId(),
                new DecisionControleDgaDto(DecisionControleDga.DEMANDER_CORRECTION, " ", null), dga))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "CONTROLE_DGA_MOTIF_REQUIS");

        service.terminer(controle.getId(), new DecisionControleDgaDto(DecisionControleDga.DEMANDER_CORRECTION,
                "Date de naissance non conforme à la CNI", null), dga);

        assertThat(controle.getStatut()).isEqualTo(StatutControle.CORRECTION_DEMANDEE);
        assertThat(adherent.getStatutControleDga()).isEqualTo(StatutControleDga.CORRECTION_DEMANDEE);
        assertThat(adherent.getStatutValidation()).isEqualTo(StatutValidationEntite.CORRECTION_DEMANDEE);
        verify(serviceAudit).tracer(eq(TypeOperation.CONTROLE_DGA_CORRECTION_DEMANDEE), eq("adherent"),
                eq(adherent.getId()), any(), any(), anyString());
    }

    @Test
    void unDoubleEnvoiDeLaDecisionNeSAppliqueQuUneFois() {
        controle.demarrer(dga.getId());
        controle.terminer(StatutControle.REJETE, dga.getId(), "Faux document", "cle-decision");

        var resultat = service.terminer(controle.getId(),
                new DecisionControleDgaDto(DecisionControleDga.REJETER, "Faux document", "cle-decision"), dga);
        assertThat(resultat.statut()).isEqualTo(StatutControle.REJETE);

        assertThatThrownBy(() -> service.terminer(controle.getId(),
                new DecisionControleDgaDto(DecisionControleDga.VALIDER, null, "autre-cle"), dga))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "CONTROLE_DGA_DEJA_TERMINE");
    }

    @Test
    void unControleTermineNeSeModifiePlus() {
        controle.terminer(StatutControle.VALIDE, dga.getId(), null, null);

        assertThatThrownBy(() -> service.verifierChamp(controle.getId(), nom.getId(),
                new VerifierChampDto(StatutCorrespondance.NON_CORRESPOND, "X", "Après coup", null), dga))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "CONTROLE_DGA_DEJA_TERMINE");
    }

    // ------------------------------------------------------------------------------------------ Ouverture

    @Test
    void lOuvertureSuitLaMatriceDocumentaire() {
        when(controleRepository.findFirstByAdherentIdOrderByTourDesc(adherent.getId())).thenReturn(Optional.empty());
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(1L);
        // CNI obligatoire et 3 informations ; acte de naissance conditionnel (absent : pas contrôlé) ; formulaire
        // d'adhésion obligatoire sans information rattachée (contrôle de présence) ; résidence non applicable.
        when(serviceExigence.enVigueur(any())).thenReturn(List.of(
                exigence("CNI", null, NiveauExigence.OBLIGATOIRE),
                exigence("CNI", "nom", NiveauExigence.OBLIGATOIRE),
                exigence("CNI", "prenoms", NiveauExigence.OBLIGATOIRE),
                exigence("CNI", "dateNaissance", NiveauExigence.OBLIGATOIRE),
                exigence("ACTE_NAISSANCE", null, NiveauExigence.CONDITIONNELLE),
                exigence("FORMULAIRE_ADHESION", null, NiveauExigence.OBLIGATOIRE),
                exigence("JUSTIFICATIF_RESIDENCE", null, NiveauExigence.NON_APPLICABLE)));
        when(documentRepository.findByAdherentIdAndArchiveFalseOrderByCreeLeDesc(adherent.getId())).thenReturn(List.of());
        List<ControleDgaDocument> documents = new ArrayList<>();
        when(documentControleRepository.save(any(ControleDgaDocument.class))).thenAnswer(i -> {
            documents.add(i.getArgument(0));
            return i.getArgument(0);
        });
        List<ControleDgaChamp> champs = new ArrayList<>();
        when(champRepository.save(any(ControleDgaChamp.class))).thenAnswer(i -> {
            champs.add(i.getArgument(0));
            return i.getArgument(0);
        });

        service.ouvrir(adherent, gestionnaire.getId());

        assertThat(documents).extracting(ControleDgaDocument::getTypeDocument).containsExactly("CNI", "FORMULAIRE_ADHESION");
        assertThat(documents).allMatch(d -> d.getDocumentId() == null && d.isObligatoire() && d.getExigenceId() != null);
        verify(champRepository, times(4)).save(any(ControleDgaChamp.class));
        assertThat(champs).filteredOn(c -> c.getChamp().equals("dateNaissance"))
                .extracting(ControleDgaChamp::getValeurNumerique).containsExactly("1990-01-01");
        assertThat(champs).filteredOn(c -> c.getChamp().equals("presence")).hasSize(1);
        assertThat(champs).allMatch(c -> c.getExigenceId() != null);
    }

    private static ExigenceDocumentaire exigence(String type, String champ, NiveauExigence niveau) {
        try {
            var constructeur = ExigenceDocumentaire.class.getDeclaredConstructor();
            constructeur.setAccessible(true);
            ExigenceDocumentaire e = constructeur.newInstance();
            fixerId(EntiteAuditable.class, e, UUID.randomUUID());
            Map<String, Object> valeurs = new java.util.HashMap<>();
            valeurs.put("code", type + (champ == null ? "" : "_" + champ));
            valeurs.put("typeDocument", type);
            valeurs.put("champ", champ);
            valeurs.put("libelle", champ == null ? type : champ);
            valeurs.put("niveau", niveau);
            valeurs.put("verificationDga", true);
            valeurs.put("actif", true);
            valeurs.put("statutValidation", "V");
            for (var entree : valeurs.entrySet()) {
                Field f = ExigenceDocumentaire.class.getDeclaredField(entree.getKey());
                f.setAccessible(true);
                f.set(e, entree.getValue());
            }
            return e;
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static Utilisateur utilisateur() {
        Utilisateur u = mock(Utilisateur.class);
        UUID id = UUID.randomUUID();
        lenient().when(u.getId()).thenReturn(id);
        return u;
    }

    private static void fixerId(Class<?> classe, Object entite, UUID id) {
        try {
            Field champ = classe.getDeclaredField("id");
            champ.setAccessible(true);
            champ.set(entite, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
