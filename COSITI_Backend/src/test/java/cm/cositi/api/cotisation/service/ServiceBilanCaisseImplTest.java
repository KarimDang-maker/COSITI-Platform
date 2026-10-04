package cm.cositi.api.cotisation.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.cotisation.dto.RapprochementCaisseDto;
import cm.cositi.api.cotisation.entite.BilanCaisseJournalier;
import cm.cositi.api.cotisation.entite.StatutBilanCaisse;
import cm.cositi.api.cotisation.repository.BilanCaisseJournalierRepository;
import cm.cositi.api.notification.ServiceNotification;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;

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
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceBilanCaisseImplTest {

    private static final LocalDate JOUR = LocalDate.now().minusDays(1);

    @Mock
    private BilanCaisseJournalierRepository repository;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private ServiceParametre serviceParametre;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private ServiceNotification serviceNotification;
    @Mock
    private ApplicationEventPublisher evenements;

    private ServiceBilanCaisseImpl service;
    private Utilisateur gestionnaire;
    private Utilisateur daf;

    @BeforeEach
    void setUp() {
        service = spy(new ServiceBilanCaisseImpl(repository, jdbcTemplate, serviceParametre, serviceAudit,
                serviceNotification, evenements));
        // Le calcul SQL du montant numérique est isolé : on teste ici les règles de cycle de vie du bilan.
        lenient().doReturn(new ServiceBilanCaisseImpl.CalculNumerique(3, new BigDecimal("15000"), 2,
                new BigDecimal("10000"), Map.of(), List.of("ESPECES"), List.of("VALIDE")))
                .when(service).calculer(any());
        lenient().when(repository.saveAndFlush(any(BilanCaisseJournalier.class))).thenAnswer(i -> i.getArgument(0));

        gestionnaire = mock(Utilisateur.class);
        lenient().when(gestionnaire.getId()).thenReturn(UUID.randomUUID());
        daf = mock(Utilisateur.class);
        lenient().when(daf.getId()).thenReturn(UUID.randomUUID());
        lenient().when(daf.possedeRole("DAF")).thenReturn(true);
    }

    private BilanCaisseJournalier bilanSaisi() {
        return new BilanCaisseJournalier(JOUR, new BigDecimal("10000"), 2, new BigDecimal("10000"), null,
                gestionnaire.getId());
    }

    @Test
    void saisirCalculeLEcartPhysiqueMoinsNumeriqueEtPrevientLeDaf() {
        when(repository.findByDateBilan(JOUR)).thenReturn(Optional.empty());

        RapprochementCaisseDto resultat = service.saisirCaissePhysique(JOUR, new BigDecimal("9500"), "Billets comptés",
                gestionnaire);

        assertThat(resultat.ecart()).isEqualByComparingTo("-500");
        assertThat(resultat.montantNumerique()).isEqualByComparingTo("10000");
        assertThat(resultat.statut()).isEqualTo("SAISI");
        verify(serviceNotification).notifierRoles(eq(List.of("DAF")), eq("BILAN_CAISSE_ECART"), anyString(),
                anyString(), eq("bilan_caisse"), any());
        verify(serviceAudit).tracer(eq(TypeOperation.BILAN_CAISSE_SAISIE), eq("bilan_caisse"), any(), any(), any(), any());
        verify(evenements).publishEvent(any(PaiementModifieEvent.class));
    }

    @Test
    void saisirSansEcartNeNotifiePas() {
        when(repository.findByDateBilan(JOUR)).thenReturn(Optional.empty());

        service.saisirCaissePhysique(JOUR, new BigDecimal("10000"), null, gestionnaire);

        verify(serviceNotification, never()).notifierRoles(any(), any(), any(), any(), any(), any());
    }

    @Test
    void saisirRefuseUnSecondBilanPourLaMemeDate() {
        BilanCaisseJournalier bilanExistant = bilanSaisi();
        when(repository.findByDateBilan(JOUR)).thenReturn(Optional.of(bilanExistant));

        assertThatThrownBy(() -> service.saisirCaissePhysique(JOUR, BigDecimal.TEN, null, gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "BILAN_CAISSE_DEJA_SAISI");
    }

    @Test
    void saisirRemplaceUnBilanEnAnomalie() {
        BilanCaisseJournalier bilan = bilanSaisi();
        bilan.signalerAnomalie(daf.getId(), "Recompter");
        when(repository.findByDateBilan(JOUR)).thenReturn(Optional.of(bilan));

        RapprochementCaisseDto resultat = service.saisirCaissePhysique(JOUR, new BigDecimal("10000"), null, gestionnaire);

        assertThat(resultat.statut()).isEqualTo("SAISI");
        assertThat(resultat.ecart()).isEqualByComparingTo("0");
    }

    @Test
    void saisirRefuseUneDateFuture() {
        assertThatThrownBy(() -> service.saisirCaissePhysique(LocalDate.now().plusDays(1), BigDecimal.TEN, null,
                gestionnaire))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "BILAN_CAISSE_DATE_FUTURE");
    }

    @Test
    void validerEstReserveAuDaf() {
        assertThatThrownBy(() -> service.valider(JOUR, null, null, gestionnaire))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasFieldOrPropertyWithValue("code", "BILAN_CAISSE_DECISION_RESERVEE_DAF");
    }

    @Test
    void validerRefuseSonPropreBilan() {
        BilanCaisseJournalier bilan = new BilanCaisseJournalier(JOUR, BigDecimal.TEN, 1, BigDecimal.TEN, null, daf.getId());
        when(repository.findByDateBilan(JOUR)).thenReturn(Optional.of(bilan));

        assertThatThrownBy(() -> service.valider(JOUR, null, null, daf))
                .isInstanceOf(ExceptionMetier.class)
                .hasFieldOrPropertyWithValue("code", "BILAN_CAISSE_AUTO_VALIDATION_INTERDITE");
    }

    @Test
    void validerRefuseUneVersionObsolete() {
        BilanCaisseJournalier bilanExistant = bilanSaisi();
        when(repository.findByDateBilan(JOUR)).thenReturn(Optional.of(bilanExistant));

        assertThatThrownBy(() -> service.valider(JOUR, null, 7L, daf))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "BILAN_CAISSE_VERSION_OBSOLETE");
    }

    @Test
    void validerPasseLeBilanEnValideEtNotifieLAuteur() {
        BilanCaisseJournalier bilanExistant = bilanSaisi();
        when(repository.findByDateBilan(JOUR)).thenReturn(Optional.of(bilanExistant));

        RapprochementCaisseDto resultat = service.valider(JOUR, "RAS", null, daf);

        assertThat(resultat.statut()).isEqualTo(StatutBilanCaisse.VALIDE.name());
        assertThat(resultat.validePar()).isEqualTo(daf.getId());
        verify(serviceNotification).notifier(eq(gestionnaire.getId()), eq("BILAN_CAISSE_VALIDE"), anyString(),
                anyString(), eq("bilan_caisse"), any());
    }

    @Test
    void validerRefuseUnBilanDejaValide() {
        BilanCaisseJournalier bilan = bilanSaisi();
        bilan.valider(UUID.randomUUID(), null);
        when(repository.findByDateBilan(JOUR)).thenReturn(Optional.of(bilan));

        assertThatThrownBy(() -> service.valider(JOUR, null, null, daf))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "BILAN_CAISSE_DEJA_VALIDE");
    }

    @Test
    void signalerAnomalieExigeUnMotif() {
        assertThatThrownBy(() -> service.signalerAnomalie(JOUR, "  ", daf))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "BILAN_CAISSE_MOTIF_REQUIS");
    }

    @Test
    void signalerAnomalieRefuseUnBilanValide() {
        BilanCaisseJournalier bilan = bilanSaisi();
        bilan.valider(UUID.randomUUID(), null);
        when(repository.findByDateBilan(JOUR)).thenReturn(Optional.of(bilan));

        assertThatThrownBy(() -> service.signalerAnomalie(JOUR, "Billets manquants", daf))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "BILAN_CAISSE_TRANSITION_INTERDITE");
    }

    @Test
    void signalerAnomalieNotifieLAuteurDeLaSaisie() {
        BilanCaisseJournalier bilanExistant = bilanSaisi();
        when(repository.findByDateBilan(JOUR)).thenReturn(Optional.of(bilanExistant));

        RapprochementCaisseDto resultat = service.signalerAnomalie(JOUR, "Billets manquants", daf);

        assertThat(resultat.statut()).isEqualTo("ANOMALIE");
        assertThat(resultat.motifAnomalie()).isEqualTo("Billets manquants");
        verify(serviceNotification).notifier(eq(gestionnaire.getId()), eq("BILAN_CAISSE_ANOMALIE"), anyString(),
                anyString(), eq("bilan_caisse"), any());
    }
}
