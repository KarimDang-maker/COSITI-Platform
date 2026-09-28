package cm.cositi.api.cotisation.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.cotisation.dto.AnnulerPaiementDto;
import cm.cositi.api.cotisation.dto.EnregistrementPaiementDto;
import cm.cositi.api.cotisation.dto.RecommandationAllocationDto;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.cotisation.repository.RecommandationAllocationPaiementRepository;
import cm.cositi.api.droits.service.ServiceCalculDroits;
import cm.cositi.api.notification.ServiceNotification;
import cm.cositi.api.parametre.ParametreRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
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
    private RecommandationAllocationPaiementRepository recommandationRepository;
    @Mock
    private ServiceParametre serviceParametre;
    @Mock
    private ParametreRepository parametreRepository;
    @Mock
    private ServiceNotification serviceNotification;

    private ServicePaiementImpl service;
    private Utilisateur agentCreateur;
    private Adherent adherent;

    @BeforeEach
    void setUp() throws Exception {
        service = new ServicePaiementImpl(paiementRepository, adherentRepository, jdbcTemplate, perimetre,
                serviceAffectationPaiement, serviceCalculDroits, serviceAudit, recommandationRepository,
                serviceParametre, parametreRepository, serviceNotification);

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
                "ESPECES", null, "COTISATION", null, null);
    }

    @Test
    void enregistrerRefuseReferenceManquantePourMobileMoney() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        lenient().when(perimetre.estPerimetreGlobal(any())).thenReturn(true);
        var dto = new EnregistrementPaiementDto(adherent.getId(), LocalDate.now(), BigDecimal.valueOf(1000),
                "ORANGE_MONEY", "  ", "COTISATION", null, null);

        assertThatThrownBy(() -> service.enregistrer(dto, "cle-1", agentCreateur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_REFERENCE_MANQUANTE");
    }

    @Test
    void enregistrerRefuseDateFutureOuAnterieureALAdhesion() {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        var dtoFutur = new EnregistrementPaiementDto(adherent.getId(), LocalDate.now().plusDays(1),
                BigDecimal.valueOf(1000), "ESPECES", null, "COTISATION", null, null);

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

    /**
     * Correctif COSITI V1 §8 : la recommandation structurée d'allocation Sécurité Sociale/Épargne recueillie
     * par l'agent est persistée dès l'enregistrement du paiement (avant validation), et validée immédiatement
     * (échec rapide) plutôt qu'à la seule validation par le DAF.
     */
    @Test
    void enregistrerPersisteLaRecommandationAllocationEtLaJournalise() throws Exception {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        lenient().when(perimetre.estPerimetreGlobal(any())).thenReturn(true);
        when(jdbcTemplate.queryForObject("SELECT nextval('seq_numero_recu')", Long.class)).thenReturn(1L);
        when(paiementRepository.save(any())).thenAnswer(inv -> {
            Paiement p = inv.getArgument(0);
            setId(p, UUID.randomUUID());
            return p;
        });
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(BigDecimal.valueOf(700));
        when(recommandationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var recommandation = new RecommandationAllocationDto(BigDecimal.valueOf(900), BigDecimal.valueOf(400), null, null);
        var dto = new EnregistrementPaiementDto(adherent.getId(), LocalDate.now(), BigDecimal.valueOf(1300),
                "ESPECES", null, "COTISATION", null, recommandation);

        service.enregistrer(dto, "cle-recommandation", agentCreateur);

        verify(recommandationRepository).save(any());
        verify(serviceAudit).tracer(eq(TypeOperation.RECOMMANDATION_ALLOCATION_ENREGISTREMENT), any(), any(), any(), any(), any());
    }

    @Test
    void enregistrerRefuseLaRecommandationSiSecuriteSocialeSousLePlancher() throws Exception {
        when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        lenient().when(perimetre.estPerimetreGlobal(any())).thenReturn(true);
        when(jdbcTemplate.queryForObject("SELECT nextval('seq_numero_recu')", Long.class)).thenReturn(1L);
        when(paiementRepository.save(any())).thenAnswer(inv -> {
            Paiement p = inv.getArgument(0);
            setId(p, UUID.randomUUID());
            return p;
        });
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(BigDecimal.valueOf(700));

        var recommandationInvalide = new RecommandationAllocationDto(BigDecimal.valueOf(600), BigDecimal.valueOf(700), null, null);
        var dto = new EnregistrementPaiementDto(adherent.getId(), LocalDate.now(), BigDecimal.valueOf(1300),
                "ESPECES", null, "COTISATION", null, recommandationInvalide);

        assertThatThrownBy(() -> service.enregistrer(dto, "cle-recommandation-invalide", agentCreateur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "ALLOCATION_SECURITE_SOCIALE_INSUFFISANTE");
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
}
