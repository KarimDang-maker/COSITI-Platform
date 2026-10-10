package cm.cositi.api.cotisation.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.entite.EntiteAuditable;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.StatutPaiement;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.droits.service.ServiceCalculDroits;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import cm.cositi.api.workflow.entite.DemandeValidation;
import cm.cositi.api.workflow.entite.ElementDemandeValidation;
import cm.cositi.api.workflow.entite.TypeDonneeChamp;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdaptateurWorkflowPaiementTest {

    @Mock
    private PaiementRepository paiementRepository;
    @Mock
    private AdherentRepository adherentRepository;
    @Mock
    private ServiceAffectationPaiement serviceAffectationPaiement;
    @Mock
    private ServiceCalculDroits serviceCalculDroits;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private ApplicationEventPublisher evenements;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private cm.cositi.api.parametre.ServiceParametre serviceParametre;

    private AdaptateurWorkflowPaiement adaptateur;
    private Adherent adherent;
    private final Utilisateur daf = mock(Utilisateur.class);

    @BeforeEach
    void setUp() {
        adaptateur = new AdaptateurWorkflowPaiement(paiementRepository, adherentRepository, serviceAffectationPaiement,
                serviceCalculDroits, perimetre, serviceAudit, evenements, jdbcTemplate,
                new RegleRepartitionCotisation(serviceParametre, jdbcTemplate));
        lenient().when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(new BigDecimal("700"));
        lenient().when(serviceParametre.decimal("MONTANT_MINIMUM_EPARGNE")).thenReturn(new BigDecimal("300"));
        lenient().when(serviceParametre.booleen("EPARGNE_FACULTATIVE_PAR_COTISATION")).thenReturn(true);
        adherent = new Adherent("COSITI-00010", "Abena", "677000010", UUID.randomUUID(), UUID.randomUUID(), "loc",
                LocalDate.now().minusYears(1));
        fixerId(adherent, UUID.randomUUID());
        lenient().when(adherentRepository.findById(adherent.getId())).thenReturn(Optional.of(adherent));
        lenient().when(paiementRepository.saveAndFlush(any(Paiement.class))).thenAnswer(i -> i.getArgument(0));
        lenient().when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), any())).thenReturn(0L);
    }

    private Paiement paiement(StatutPaiement statut) {
        Paiement p = new Paiement(adherent.getId(), "REC-000100", LocalDate.now().minusDays(2), new BigDecimal("5000.00"),
                "ESPECES", null, "COTISATION", null, null);
        fixerId(p, UUID.randomUUID());
        if (statut == StatutPaiement.VALIDE) {
            p.valider(UUID.randomUUID());
        } else if (statut == StatutPaiement.INCOHERENCE) {
            p.signalerIncoherence("Montant douteux");
        } else if (statut == StatutPaiement.BROUILLON) {
            p.marquerBrouillon();
        } else if (statut == StatutPaiement.REJETE) {
            p.rejeter("Faux reçu", UUID.randomUUID());
        }
        lenient().when(paiementRepository.findById(p.getId())).thenReturn(Optional.of(p));
        return p;
    }

    private DemandeValidation demande(Paiement p) {
        return new DemandeValidation("DV-2026-000010", TypeOperationWorkflow.PAIEMENT_CORRECTION, p.getId(),
                "Erreur de saisie", 0L, UUID.randomUUID(), "agent", null);
    }

    @Test
    void ouvertureRefuseUnBrouillonModifiableDirectement() {
        Paiement p = paiement(StatutPaiement.BROUILLON);

        assertThatThrownBy(() -> adaptateur.controlerOuverture(p.getId(), TypeOperationWorkflow.PAIEMENT_CORRECTION))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_BROUILLON_MODIFIABLE");
    }

    @Test
    void ouvertureRefuseUnPaiementRejete() {
        Paiement p = paiement(StatutPaiement.REJETE);

        assertThatThrownBy(() -> adaptateur.controlerOuverture(p.getId(), TypeOperationWorkflow.PAIEMENT_CORRECTION))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_TRANSITION_INTERDITE");
    }

    @Test
    void propositionMobileMoneySansReferenceRefusee() {
        Paiement p = paiement(StatutPaiement.A_CONTROLER);
        Map<String, String> resultantes = Map.of("montant", "5000", "datePaiement", p.getDatePaiement().toString(),
                "modePaiement", "MTN_MOMO");

        assertThatThrownBy(() -> adaptateur.controlerPropositions(p.getId(), TypeOperationWorkflow.PAIEMENT_CORRECTION,
                resultantes, Map.of("modePaiement", "MTN_MOMO")))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_REFERENCE_MANQUANTE");
    }

    @Test
    void correctionDeMontantDUnPaiementValideReaffecteEtRecalculeLesDroits() {
        Paiement p = paiement(StatutPaiement.VALIDE);
        ElementDemandeValidation montant = new ElementDemandeValidation(UUID.randomUUID(), "montant",
                TypeDonneeChamp.DECIMAL, "5000", "4500", null);

        List<String> avertissements = adaptateur.appliquer(demande(p), List.of(montant), daf);

        assertThat(p.getMontant()).isEqualByComparingTo("4500");
        verify(serviceAffectationPaiement).reaffecterApresCorrection(p.getId(), daf);
        verify(serviceAffectationPaiement).verifierInvariant(p.getId());
        verify(serviceCalculDroits).recalculer(eq(adherent.getId()), anyString(), eq(daf));
        verify(serviceAudit).tracer(eq(TypeOperation.PAIEMENT_CORRECTION), eq("paiement"), eq(p.getId()), any(), any(),
                anyString());
        verify(evenements).publishEvent(any(PaiementModifieEvent.class));
        assertThat(avertissements).anyMatch(a -> a.contains("recalculés"));
    }

    @Test
    void correctionDUnPaiementIncoherentLeRouvreSansRecalcul() {
        Paiement p = paiement(StatutPaiement.INCOHERENCE);
        ElementDemandeValidation montant = new ElementDemandeValidation(UUID.randomUUID(), "montant",
                TypeDonneeChamp.DECIMAL, "5000", "6000", null);

        adaptateur.appliquer(demande(p), List.of(montant), daf);

        assertThat(p.getStatut()).isEqualTo(StatutPaiement.A_CONTROLER);
        verify(serviceCalculDroits, never()).recalculer(any(), any(), any());
        verify(serviceAffectationPaiement, never()).reaffecterApresCorrection(any(), any());
    }

    @Test
    void applicationRevalideLesInvariantsAuMomentDeLApprobation() {
        Paiement p = paiement(StatutPaiement.VALIDE);
        ElementDemandeValidation dateFuture = new ElementDemandeValidation(UUID.randomUUID(), "datePaiement",
                TypeDonneeChamp.DATE, p.getDatePaiement().toString(), LocalDate.now().plusDays(3).toString(), null);

        assertThatThrownBy(() -> adaptateur.appliquer(demande(p), List.of(dateFuture), daf))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_DATE_INCOHERENTE");
        verify(paiementRepository, never()).saveAndFlush(any());
    }

    @Test
    void unBilanDeCaisseValideToucheEstSignale() {
        Paiement p = paiement(StatutPaiement.A_CONTROLER);
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), any())).thenReturn(1L);
        ElementDemandeValidation reference = new ElementDemandeValidation(UUID.randomUUID(), "montant",
                TypeDonneeChamp.DECIMAL, "5000", "5500", null);

        List<String> avertissements = adaptateur.appliquer(demande(p), List.of(reference), daf);

        assertThat(avertissements).anyMatch(a -> a.contains("bilan de caisse validé"));
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

    // ------------------------------------------------------------------ Répartition (V22)

    @Test
    void corrigerLeMontantDUneCotisationRepartieSansNouvelleRepartitionEstRefuse() {
        Paiement p = paiement(StatutPaiement.A_CONTROLER);
        p.definirRepartition(new BigDecimal("700.00"), new BigDecimal("4300.00"),
                cm.cositi.api.cotisation.entite.OrigineRepartition.SAISIE);
        when(paiementRepository.findById(p.getId())).thenReturn(Optional.of(p));
        java.util.Map<String, String> resultantes = new java.util.HashMap<>(java.util.Map.of(
                "montant", "6000", "datePaiement", p.getDatePaiement().toString(), "modePaiement", "ESPECES",
                "montantSecuriteSociale", "700.00", "montantEpargne", "4300.00"));

        assertThatThrownBy(() -> adaptateur.controlerPropositions(p.getId(), null, resultantes,
                java.util.Map.of("montant", "6000")))
                .hasFieldOrPropertyWithValue("code", "COTISATION_REPARTITION_REQUISE");
    }

    @Test
    void uneRepartitionProposeeIncoherenteAvecLeMontantEstRefusee() {
        Paiement p = paiement(StatutPaiement.A_CONTROLER);
        p.definirRepartition(new BigDecimal("700.00"), new BigDecimal("4300.00"),
                cm.cositi.api.cotisation.entite.OrigineRepartition.SAISIE);
        when(paiementRepository.findById(p.getId())).thenReturn(Optional.of(p));
        java.util.Map<String, String> resultantes = new java.util.HashMap<>(java.util.Map.of(
                "montant", "5000.00", "datePaiement", p.getDatePaiement().toString(), "modePaiement", "ESPECES",
                "montantSecuriteSociale", "1000", "montantEpargne", "3000"));

        assertThatThrownBy(() -> adaptateur.controlerPropositions(p.getId(), null, resultantes,
                java.util.Map.of("montantSecuriteSociale", "1000", "montantEpargne", "3000")))
                .hasFieldOrPropertyWithValue("code", "COTISATION_REPARTITION_INCOHERENTE");
    }
}
