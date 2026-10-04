package cm.cositi.api.cotisation.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
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

    private ServicePaiementImpl service;
    private Utilisateur agentCreateur;
    private Adherent adherent;

    @BeforeEach
    void setUp() throws Exception {
        service = new ServicePaiementImpl(paiementRepository, adherentRepository, jdbcTemplate, perimetre,
                serviceAffectationPaiement, serviceCalculDroits, serviceAudit, evenements, demandeValidationRepository);

        agentCreateur = new Utilisateur("agent.saisie", "hash", "Agent Saisie");
        setId(agentCreateur, UUID.randomUUID());

        adherent = new Adherent("COSITI-00001", "Test", "677000000", UUID.randomUUID(), UUID.randomUUID(),
                "loc", LocalDate.now().minusMonths(6));
        setId(adherent, UUID.randomUUID());
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
}
