package cm.cositi.api.cotisation.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.Adhesion;
import cm.cositi.api.adherent.entite.Pack;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.AdhesionRepository;
import cm.cositi.api.adherent.repository.PackRepository;
import cm.cositi.api.cotisation.entite.OrigineRepartition;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.cotisation.dto.AnnulerPaiementDto;
import cm.cositi.api.cotisation.dto.EnregistrementPaiementDto;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.cotisation.dto.VerifierDoublonPaiementDto;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.StatutPaiement;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.droits.service.ServiceCalculDroits;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import cm.cositi.api.workflow.repository.DemandeValidationRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServicePaiementImplTest {

    @Mock
    private PaiementRepository paiementRepository;
    @Mock
    private AdherentRepository adherentRepository;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ServiceAffectationPaiement serviceAffectationPaiement;
    @Mock
    private ServiceCalculDroits serviceCalculDroits;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private ApplicationEventPublisher evenements;
    @Mock
    private DemandeValidationRepository demandeValidationRepository;
    @Mock
    private AdhesionRepository adhesionRepository;
    @Mock
    private PackRepository packRepository;
    @Mock
    private ServiceParametre serviceParametre;
    @Mock
    private cm.cositi.api.adhesion.repository.FraisAdhesionRepository fraisRepository;
    @Mock
    private cm.cositi.api.adhesion.service.ServiceFraisAdhesion serviceFraisAdhesion;

    private final UUID packCourant = UUID.randomUUID();

    private ServicePaiementImpl service;
    private Utilisateur agentCreateur;
    private Adherent adherent;

    @BeforeEach
    void setUp() throws Exception {
        // Règle de répartition réelle (pas un mock) : les tests de saisie l'exercent avec les seuils en vigueur.
        RegleRepartitionCotisation regle = new RegleRepartitionCotisation(serviceParametre, jdbcTemplate);
        service = new ServicePaiementImpl(paiementRepository, adherentRepository, jdbcTemplate, perimetre,
                serviceAffectationPaiement, serviceCalculDroits, serviceAudit, evenements, demandeValidationRepository,
                regle, adhesionRepository, packRepository, serviceParametre,
                new RegleFraisAvantCotisation(fraisRepository, serviceFraisAdhesion));
        lenient().when(serviceFraisAdhesion.montantUnitaire()).thenReturn(new BigDecimal("1000"));
        lenient().when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(new BigDecimal("700"));
        lenient().when(serviceParametre.decimal("MONTANT_MINIMUM_EPARGNE")).thenReturn(new BigDecimal("300"));
        lenient().when(serviceParametre.booleen("EPARGNE_FACULTATIVE_PAR_COTISATION")).thenReturn(true);
        lenient().when(serviceParametre.texte(ServicePaiementImpl.CLE_STATUTS_REFUSES)).thenReturn("");

        agentCreateur = new Utilisateur("agent.saisie", "hash", "Agent Saisie");
        setId(agentCreateur, UUID.randomUUID());

        adherent = new Adherent("COSITI-00001", "Test", "677000000", UUID.randomUUID(), UUID.randomUUID(),
                "loc", LocalDate.now().minusMonths(6));
        setId(adherent, UUID.randomUUID());
        // Dossier antérieur au frais d'adhésion (aucun frais, déjà actif) : jamais bloqué (V23 §5).
        adherent.setStatut(cm.cositi.api.adherent.entite.StatutAdherent.ACTIF);
        // Par défaut l'adhérent a déjà un pack (dossier antérieur) ; les tests « première cotisation » le retirent.
        lenient().when(adhesionRepository.findByAdherentIdAndDateFinIsNull(adherent.getId())).thenReturn(Optional.of(
                new Adhesion(adherent.getId(), packCourant, adherent.getDateAdhesion(), "initiale", null)));
    }

    private void setId(Object entite, UUID id) throws Exception {
        Field champ = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
        champ.setAccessible(true);
        champ.set(entite, id);
    }

    private EnregistrementPaiementDto dtoValide() {
        return new EnregistrementPaiementDto(adherent.getId(), LocalDate.now(), BigDecimal.valueOf(5000),
                "ESPECES", null, "COTISATION", null);
    }

    @Test
    void enregistrerRefuseReferenceManquantePourMobileMoney() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        lenient().when(perimetre.estPerimetreGlobal(any())).thenReturn(true);
        var dto = new EnregistrementPaiementDto(adherent.getId(), LocalDate.now(), BigDecimal.valueOf(1000),
                "ORANGE_MONEY", "  ", "COTISATION", null);

        assertThatThrownBy(() -> service.enregistrer(dto, "cle-1", agentCreateur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_REFERENCE_MANQUANTE");
    }

    @Test
    void enregistrerRefuseDateFutureOuAnterieureALAdhesion() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        var dtoFutur = new EnregistrementPaiementDto(adherent.getId(), LocalDate.now().plusDays(1),
                BigDecimal.valueOf(1000), "ESPECES", null, "COTISATION", null);

        assertThatThrownBy(() -> service.enregistrer(dtoFutur, "cle-2", agentCreateur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_DATE_INCOHERENTE");
    }

    @Test
    void enregistrerRefuseSiAdherentArchive() {
        adherent.archiver("someone", "motif");
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));

        assertThatThrownBy(() -> service.enregistrer(dtoValide(), "cle-3", agentCreateur))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_ADHERENT_ARCHIVE");
    }

    @Test
    void enregistrerRenvoieLExistantSiClaIdempotenceDejaVue() {
        Paiement existant = new Paiement(adherent.getId(), "REC-000001", LocalDate.now(), BigDecimal.TEN,
                "ESPECES", null, "COTISATION", null, "cle-idempotente");
        when(paiementRepository.findByCleIdempotence("cle-idempotente")).thenReturn(Optional.of(existant));

        var resultat = service.enregistrer(dtoValide(), "cle-idempotente", agentCreateur);

        org.assertj.core.api.Assertions.assertThat(resultat.dejaExistant()).isTrue();
    }

    @Test
    void validerRefuseSiValidateurEstLeCreateur() throws Exception {
        Paiement paiement = new Paiement(adherent.getId(), "REC-000002", LocalDate.now(), BigDecimal.TEN,
                "ESPECES", null, "COTISATION", null, null);
        setId(paiement, UUID.randomUUID());
        // creePar est renseigné par Spring Data JPA Auditing en conditions réelles (identifiant de agentCreateur) ;
        // on force la valeur ici pour isoler la règle métier testée, sans dépendre du contexte d'audit Spring.
        Field champCreePar = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("creePar");
        champCreePar.setAccessible(true);
        champCreePar.set(paiement, agentCreateur.getIdentifiant());

        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));

        assertThatThrownBy(() -> service.valider(paiement.getId(), agentCreateur))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_AUTO_VALIDATION_INTERDITE");
    }

    @Test
    void validerRefuseSiDejaValide() throws Exception {
        Paiement paiement = new Paiement(adherent.getId(), "REC-000003", LocalDate.now(), BigDecimal.TEN,
                "ESPECES", null, "COTISATION", null, null);
        setId(paiement, UUID.randomUUID());
        paiement.valider(UUID.randomUUID());
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));

        Utilisateur autreUtilisateur = new Utilisateur("dafcontrole", "hash", "DAF Controle");
        setId(autreUtilisateur, UUID.randomUUID());

        assertThatThrownBy(() -> service.valider(paiement.getId(), autreUtilisateur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_DEJA_VALIDE");
    }

    @Test
    void annulerExigeUnMotif() {
        assertThatThrownBy(() -> service.annuler(UUID.randomUUID(), new AnnulerPaiementDto("  "), agentCreateur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_MOTIF_REQUIS");
    }

    // ------------------------------------------------------------------ Module cotisations (#13, #14, #17)

    private Paiement paiementSaisiPar(Utilisateur auteur, String numero) throws Exception {
        Paiement paiement = new Paiement(adherent.getId(), numero, LocalDate.now(), BigDecimal.TEN,
                "ESPECES", null, "COTISATION", null, null);
        setId(paiement, UUID.randomUUID());
        Field champCreePar = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("creePar");
        champCreePar.setAccessible(true);
        champCreePar.set(paiement, auteur.getIdentifiant());
        return paiement;
    }

    private Utilisateur validateur() throws Exception {
        Utilisateur daf = new Utilisateur("daf.controle", "hash", "DAF Controle");
        setId(daf, UUID.randomUUID());
        return daf;
    }

    @Test
    void enregistrerRefuseUneReferenceDeTransactionDejaUtilisee() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        Paiement existant = new Paiement(adherent.getId(), "REC-000010", LocalDate.now(), BigDecimal.TEN,
                "ORANGE_MONEY", "OM-123", "COTISATION", null, null);
        when(paiementRepository.trouverParReference(eq("ORANGE_MONEY"), eq("OM-123"), any()))
                .thenReturn(List.of(existant));
        var dto = new EnregistrementPaiementDto(adherent.getId(), LocalDate.now(), BigDecimal.valueOf(1000),
                "ORANGE_MONEY", " OM-123 ", "COTISATION", null);

        assertThatThrownBy(() -> service.enregistrer(dto, "cle-ref", agentCreateur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_REFERENCE_DEJA_UTILISEE");
        verify(paiementRepository, never()).save(any());
    }

    @Test
    void enregistrerEnBrouillonNeSoumetPasAValidation() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(42L);
        when(paiementRepository.save(any(Paiement.class))).thenAnswer(i -> i.getArgument(0));

        var resultat = service.enregistrer(dtoValide(), "cle-brouillon", agentCreateur, true);

        assertThat(resultat.paiement().statut()).isEqualTo(StatutPaiement.BROUILLON);
        assertThat(resultat.paiement().numeroRecu()).isEqualTo("REC-000042");
        verify(evenements).publishEvent(any(PaiementModifieEvent.class));
    }

    @Test
    void soumettreFaitPasserLeBrouillonAControler() throws Exception {
        Paiement paiement = paiementSaisiPar(agentCreateur, "REC-000011");
        paiement.marquerBrouillon();
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));
        when(paiementRepository.save(any(Paiement.class))).thenAnswer(i -> i.getArgument(0));
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent)); // contrôle du frais

        PaiementDto resultat = service.soumettre(paiement.getId(), agentCreateur);

        assertThat(resultat.statut()).isEqualTo(StatutPaiement.A_CONTROLER);
    }

    @Test
    void soumettreRefuseUnPaiementDejaSoumis() throws Exception {
        Paiement paiement = paiementSaisiPar(agentCreateur, "REC-000012");
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));

        assertThatThrownBy(() -> service.soumettre(paiement.getId(), agentCreateur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_DEJA_SOUMIS");
    }

    @Test
    void validerRefuseUnBrouillon() throws Exception {
        Paiement paiement = paiementSaisiPar(agentCreateur, "REC-000013");
        paiement.marquerBrouillon();
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));

        assertThatThrownBy(() -> service.valider(paiement.getId(), validateur()))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_TRANSITION_INTERDITE");
    }

    @Test
    void rejeterExigeUnMotif() {
        assertThatThrownBy(() -> service.rejeter(UUID.randomUUID(), " ", agentCreateur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_MOTIF_REQUIS");
    }

    @Test
    void rejeterRefuseUnPaiementSaisiParLeValidateurLuiMeme() throws Exception {
        Paiement paiement = paiementSaisiPar(agentCreateur, "REC-000014");
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));

        assertThatThrownBy(() -> service.rejeter(paiement.getId(), "Montant faux", agentCreateur))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_AUTO_REJET_INTERDIT");
    }

    @Test
    void rejeterPasseLePaiementEnRejeteEtTrace() throws Exception {
        Paiement paiement = paiementSaisiPar(agentCreateur, "REC-000015");
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));
        when(paiementRepository.save(any(Paiement.class))).thenAnswer(i -> i.getArgument(0));
        Utilisateur daf = validateur();

        PaiementDto resultat = service.rejeter(paiement.getId(), "Reçu illisible", daf);

        assertThat(resultat.statut()).isEqualTo(StatutPaiement.REJETE);
        assertThat(resultat.motifRejet()).isEqualTo("Reçu illisible");
        assertThat(resultat.rejetePar()).isEqualTo(daf.getId());
        verify(serviceAudit).tracer(eq(TypeOperation.PAIEMENT_REJET), eq("paiement"), eq(paiement.getId()),
                any(), any(), eq("Reçu illisible"));
    }

    @Test
    void rejeterRefuseUnPaiementDejaValide() throws Exception {
        Paiement paiement = paiementSaisiPar(agentCreateur, "REC-000016");
        paiement.valider(UUID.randomUUID());
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));

        assertThatThrownBy(() -> service.rejeter(paiement.getId(), "motif", validateur()))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_TRANSITION_INTERDITE");
    }

    @Test
    void verifierDoublonSignaleReferenceEtDoublonsPotentiels() throws Exception {
        Paiement meme = paiementSaisiPar(agentCreateur, "REC-000017");
        when(paiementRepository.trouverParReference(eq("MTN_MOMO"), eq("MM-9"), any())).thenReturn(List.of(meme));
        when(paiementRepository.trouverDoublonsPotentiels(any(), any(), any(), any(), any())).thenReturn(List.of(meme));

        var resultat = service.verifierDoublon(new VerifierDoublonPaiementDto(adherent.getId(), LocalDate.now(),
                BigDecimal.TEN, "MTN_MOMO", "MM-9"), agentCreateur);

        assertThat(resultat.referenceDejaUtilisee()).isTrue();
        assertThat(resultat.doublonsPotentiels()).hasSize(1);
        assertThat(resultat.doublonDetecte()).isTrue();
    }

    // ------------------------------------------------------------------------------------------------
    // Répartition, pack et idempotence (V22, prompt §8 à §11, §21 « tests financiers »)
    // ------------------------------------------------------------------------------------------------

    private EnregistrementPaiementDto dtoReparti(String montant, String ss, String ep, UUID packId) {
        return new EnregistrementPaiementDto(adherent.getId(), LocalDate.now(), new BigDecimal(montant), "ESPECES",
                null, "COTISATION", null, ss == null ? null : new BigDecimal(ss), ep == null ? null : new BigDecimal(ep),
                packId);
    }

    private void saisiePossible() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        lenient().when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(7L);
        lenient().when(paiementRepository.save(any(Paiement.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void cotisationMilleEgaleSeptCentsPlusTroisCentsEnregistreeAvecSaRepartition() {
        saisiePossible();

        var resultat = service.enregistrer(dtoReparti("1000", "700", "300", null), "cle-r1", agentCreateur);

        assertThat(resultat.paiement().montantSecuriteSociale()).isEqualByComparingTo("700");
        assertThat(resultat.paiement().montantEpargne()).isEqualByComparingTo("300");
        assertThat(resultat.paiement().origineRepartition()).isEqualTo(OrigineRepartition.SAISIE);
        // Saisie != validation : la cotisation attend le contrôle, rien n'est comptabilisé ni imputé.
        assertThat(resultat.paiement().statut()).isEqualTo(StatutPaiement.A_CONTROLER);
        verify(serviceAffectationPaiement, never()).affecter(any(), any());
        verify(serviceCalculDroits, never()).imputerPaiement(any());
    }

    @Test
    void cotisationQuinzeCentsEgaleSeptCentsPlusHuitCents() {
        saisiePossible();

        var resultat = service.enregistrer(dtoReparti("1500", "700", "800", null), "cle-r2", agentCreateur);

        assertThat(resultat.paiement().montantEpargne()).isEqualByComparingTo("800");
    }

    @Test
    void securiteSocialeInferieureASeptCentsRefusee() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));

        assertThatThrownBy(() -> service.enregistrer(dtoReparti("1000", "600", "400", null), "cle-r3", agentCreateur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "COTISATION_SECURITE_SOCIALE_INSUFFISANTE");
        verify(paiementRepository, never()).save(any());
    }

    @Test
    void epargneAlimenteeInferieureATroisCentsRefusee() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));

        assertThatThrownBy(() -> service.enregistrer(dtoReparti("900", "700", "200", null), "cle-r4", agentCreateur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "COTISATION_EPARGNE_INSUFFISANTE");
    }

    @Test
    void totalDifferentDeLaSommeRefuse() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));

        assertThatThrownBy(() -> service.enregistrer(dtoReparti("1000", "700", "400", null), "cle-r5", agentCreateur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "COTISATION_REPARTITION_INCOHERENTE");
    }

    @Test
    void sansRepartitionLeServeurAppliqueLaRegleParDefautEtLaRenvoie() {
        saisiePossible();

        var resultat = service.enregistrer(dtoValide(), "cle-r6", agentCreateur);

        assertThat(resultat.paiement().montantSecuriteSociale()).isEqualByComparingTo("700");
        assertThat(resultat.paiement().montantEpargne()).isEqualByComparingTo("4300");
        assertThat(resultat.paiement().origineRepartition()).isEqualTo(OrigineRepartition.PROPOSITION_SERVEUR);
    }

    @Test
    void premiereCotisationSansPackRefusee() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        lenient().when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(8L);
        when(adhesionRepository.findByAdherentIdAndDateFinIsNull(adherent.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.enregistrer(dtoReparti("1000", "700", "300", null), "cle-p1", agentCreateur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "COTISATION_PACK_REQUIS");
        verify(paiementRepository, never()).save(any());
    }

    @Test
    void premiereCotisationOuvreLAdhesionAuPackChoisiEtLaTrace() {
        saisiePossible();
        UUID packChoisi = UUID.randomUUID();
        Pack pack = org.mockito.Mockito.mock(Pack.class);
        when(pack.isActif()).thenReturn(true);
        when(adhesionRepository.findByAdherentIdAndDateFinIsNull(adherent.getId())).thenReturn(Optional.empty());
        when(packRepository.findById(packChoisi)).thenReturn(Optional.of(pack));
        when(adhesionRepository.save(any(Adhesion.class))).thenAnswer(i -> i.getArgument(0));

        var resultat = service.enregistrer(dtoReparti("1000", "700", "300", packChoisi), "cle-p2", agentCreateur);

        assertThat(resultat.paiement().packId()).isEqualTo(packChoisi);
        org.mockito.ArgumentCaptor<Adhesion> adhesion = org.mockito.ArgumentCaptor.forClass(Adhesion.class);
        verify(adhesionRepository).save(adhesion.capture());
        assertThat(adhesion.getValue().getPackId()).isEqualTo(packChoisi);
        assertThat(adhesion.getValue().getDateDebut()).isEqualTo(adherent.getDateAdhesion());
        verify(serviceAudit).tracer(eq(TypeOperation.ADHERENT_CHANGEMENT_PACK), eq("adherent"), eq(adherent.getId()),
                any(), any(), any());
    }

    @Test
    void unPackDifferentDuPackCourantEstRefuse() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        lenient().when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(9L);

        assertThatThrownBy(() -> service.enregistrer(dtoReparti("1000", "700", "300", UUID.randomUUID()), "cle-p3",
                agentCreateur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "COTISATION_PACK_DIFFERENT");
    }

    @Test
    void memeCleMemeRequeteRenvoieLaCotisationExistante() {
        EnregistrementPaiementDto dto = dtoReparti("1000", "700", "300", null);
        Paiement existant = new Paiement(adherent.getId(), "REC-000010", LocalDate.now(), new BigDecimal("1000"),
                "ESPECES", null, "COTISATION", null, "cle-i1");
        existant.setEmpreinteRequete(ServicePaiementImpl.empreinte(dto, false));
        when(paiementRepository.findByCleIdempotence("cle-i1")).thenReturn(Optional.of(existant));

        var resultat = service.enregistrer(dto, "cle-i1", agentCreateur);

        assertThat(resultat.dejaExistant()).isTrue();
        assertThat(resultat.paiement().numeroRecu()).isEqualTo("REC-000010");
        verify(paiementRepository, never()).save(any());
    }

    @Test
    void memeCleAutreRequeteEstUnConflitDIdempotence() {
        Paiement existant = new Paiement(adherent.getId(), "REC-000011", LocalDate.now(), new BigDecimal("1000"),
                "ESPECES", null, "COTISATION", null, "cle-i2");
        existant.setEmpreinteRequete(ServicePaiementImpl.empreinte(dtoReparti("1000", "700", "300", null), false));
        when(paiementRepository.findByCleIdempotence("cle-i2")).thenReturn(Optional.of(existant));

        assertThatThrownBy(() -> service.enregistrer(dtoReparti("1500", "700", "800", null), "cle-i2", agentCreateur))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "IDEMPOTENCY_KEY_CONFLIT");
    }

    @Test
    void lEmpreinteNeDependPasDeLEcritureDuMontant() {
        assertThat(ServicePaiementImpl.empreinte(dtoReparti("1000", "700", "300", null), false))
                .isEqualTo(ServicePaiementImpl.empreinte(dtoReparti("1000.00", "700.0", "300", null), false))
                .isNotEqualTo(ServicePaiementImpl.empreinte(dtoReparti("1000", "700", "300", null), true));
    }

    @Test
    @SuppressWarnings("unchecked")
    void laSaisieSerialiseLesRequetesDeMemeClePourLesSoumissionsConcurrentes() {
        saisiePossible();

        service.enregistrer(dtoReparti("1000", "700", "300", null), "cle-c1", agentCreateur);

        // Verrou transactionnel PostgreSQL pris sur la clé AVANT la lecture de l'existant.
        org.mockito.InOrder ordre = org.mockito.Mockito.inOrder(jdbcTemplate, paiementRepository);
        ordre.verify(jdbcTemplate).query(org.mockito.ArgumentMatchers.contains("pg_advisory_xact_lock"),
                any(org.springframework.jdbc.core.ResultSetExtractor.class), eq("cle-c1"));
        ordre.verify(paiementRepository).findByCleIdempotence("cle-c1");
    }

    @Test
    void unStatutRefuseParLeParametreBloqueLaCotisation() {
        adherent.setStatut(cm.cositi.api.adherent.entite.StatutAdherent.PREINSCRIT);
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        when(serviceParametre.texte(ServicePaiementImpl.CLE_STATUTS_REFUSES)).thenReturn("PREINSCRIT, RADIE");

        assertThatThrownBy(() -> service.enregistrer(dtoValide(), "cle-s1", agentCreateur))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "COTISATION_STATUT_ADHERENT_INCOMPATIBLE");
    }

    @Test
    void corrigerLeMontantDUnBrouillonRepartiExigeUneNouvelleRepartition() throws Exception {
        Paiement brouillon = new Paiement(adherent.getId(), "REC-000012", LocalDate.now(), new BigDecimal("1000"),
                "ESPECES", null, "COTISATION", null, "cle-b1");
        brouillon.marquerBrouillon();
        brouillon.definirRepartition(new BigDecimal("700"), new BigDecimal("300"), OrigineRepartition.SAISIE);
        setId(brouillon, UUID.randomUUID());
        setCreePar(brouillon, agentCreateur.getIdentifiant());
        when(paiementRepository.findById(brouillon.getId())).thenReturn(Optional.of(brouillon));

        var sansRepartition = new cm.cositi.api.cotisation.dto.CorrectionPaiementDto(new BigDecimal("1500"), null,
                null, null);
        assertThatThrownBy(() -> service.corriger(brouillon.getId(), sansRepartition, agentCreateur))
                .hasFieldOrPropertyWithValue("code", "COTISATION_REPARTITION_REQUISE");

        when(paiementRepository.save(any(Paiement.class))).thenAnswer(i -> i.getArgument(0));
        var avecRepartition = new cm.cositi.api.cotisation.dto.CorrectionPaiementDto(new BigDecimal("1500"), null,
                null, null, new BigDecimal("700"), new BigDecimal("800"));
        PaiementDto corrige = service.corriger(brouillon.getId(), avecRepartition, agentCreateur);
        assertThat(corrige.montant()).isEqualByComparingTo("1500");
        assertThat(corrige.montantEpargne()).isEqualByComparingTo("800");
    }

    private void setCreePar(Object entite, String identifiant) throws Exception {
        Field champ = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("creePar");
        champ.setAccessible(true);
        champ.set(entite, identifiant);
    }

    // ------------------------------------------------------------------------------------------------
    // V23 §5 : frais d'adhésion validé par le DAF avant toute cotisation
    // ------------------------------------------------------------------------------------------------

    private void fraisAuStatut(cm.cositi.api.adhesion.entite.StatutFraisAdhesion statut) {
        cm.cositi.api.adhesion.entite.FraisAdhesion frais =
                org.mockito.Mockito.mock(cm.cositi.api.adhesion.entite.FraisAdhesion.class);
        when(frais.getStatut()).thenReturn(statut);
        when(fraisRepository.findByAdherentIdAndTypeFrais(adherent.getId(), "ADHESION")).thenReturn(Optional.of(frais));
    }

    @Test
    void cotisationRefuseeSansFraisPourUnPreinscrit() {
        adherent.setStatut(cm.cositi.api.adherent.entite.StatutAdherent.PREINSCRIT);
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));

        assertThatThrownBy(() -> service.enregistrer(dtoValide(), "cle-f1", agentCreateur))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "COTISATION_FRAIS_ADHESION_NON_VALIDE")
                .hasMessageContaining("1 000 FCFA");
        verify(paiementRepository, never()).save(any());
    }

    @Test
    void cotisationRefuseeAvecFraisEnregistreOuEnAnomalie() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        fraisAuStatut(cm.cositi.api.adhesion.entite.StatutFraisAdhesion.ENREGISTRE);
        assertThatThrownBy(() -> service.enregistrer(dtoValide(), "cle-f2", agentCreateur))
                .hasFieldOrPropertyWithValue("code", "COTISATION_FRAIS_ADHESION_NON_VALIDE");

        fraisAuStatut(cm.cositi.api.adhesion.entite.StatutFraisAdhesion.ANOMALIE);
        assertThatThrownBy(() -> service.enregistrer(dtoValide(), "cle-f3", agentCreateur))
                .hasFieldOrPropertyWithValue("code", "COTISATION_FRAIS_ADHESION_NON_VALIDE");
    }

    @Test
    void cotisationAccepteeAvecFraisValide() {
        saisiePossible();
        adherent.setStatut(cm.cositi.api.adherent.entite.StatutAdherent.PREINSCRIT);
        fraisAuStatut(cm.cositi.api.adhesion.entite.StatutFraisAdhesion.VALIDE);

        var resultat = service.enregistrer(dtoReparti("1000", "700", "300", null), "cle-f4", agentCreateur);

        assertThat(resultat.dejaExistant()).isFalse();
    }

    @Test
    void ancienAdherentSansFraisNonBloque() {
        saisiePossible(); // ACTIF, aucun frais enregistré

        var resultat = service.enregistrer(dtoReparti("1000", "700", "300", null), "cle-f5", agentCreateur);

        assertThat(resultat.paiement().statut()).isEqualTo(StatutPaiement.A_CONTROLER);
    }
}
