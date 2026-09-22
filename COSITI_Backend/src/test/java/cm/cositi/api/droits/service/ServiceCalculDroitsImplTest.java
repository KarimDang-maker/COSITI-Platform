package cm.cositi.api.droits.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.Adhesion;
import cm.cositi.api.adherent.entite.Pack;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.AdhesionRepository;
import cm.cositi.api.adherent.repository.PackRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.droits.dto.PeriodeDroitsDto;
import cm.cositi.api.droits.entite.PeriodeDroits;
import cm.cositi.api.droits.entite.StatutPeriode;
import cm.cositi.api.droits.repository.PeriodeDroitsRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Module le plus critique du projet (jalon J6) — couverture la plus forte exigée
 * (docs/02_CLASSES_ET_METHODES.md §5). Complété par {@code DroitsIntegrationTest} (calcul réel bout en bout,
 * multi-versements, éligibilité CNPS par pack, seuil de retard).
 */
@ExtendWith(MockitoExtension.class)
class ServiceCalculDroitsImplTest {

    @Mock
    private PeriodeDroitsRepository periodeDroitsRepository;
    @Mock
    private AdherentRepository adherentRepository;
    @Mock
    private AdhesionRepository adhesionRepository;
    @Mock
    private PackRepository packRepository;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private ServiceParametre serviceParametre;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ServiceAudit serviceAudit;

    private ServiceCalculDroitsImpl service;

    private UUID adherentId;
    private UUID packId;
    private Adherent adherent;
    private Pack pack;
    private Adhesion adhesionOuverte;

    @BeforeEach
    void setUp() throws Exception {
        service = new ServiceCalculDroitsImpl(periodeDroitsRepository, adherentRepository, adhesionRepository,
                packRepository, jdbcTemplate, serviceParametre, perimetre, serviceAudit);

        adherentId = UUID.randomUUID();
        packId = UUID.randomUUID();

        adherent = new Adherent("COSITI-00099", "Test Droits", "677000099", UUID.randomUUID(), UUID.randomUUID(),
                "loc", LocalDate.of(2026, 1, 1));
        setChamp(adherent, cm.cositi.api.commun.entite.EntiteAuditable.class, "id", adherentId);

        pack = instancierParConstructeurProtege(Pack.class);
        setChamp(pack, Pack.class, "id", packId);
        setChamp(pack, Pack.class, "code", "PACK_700");
        setChamp(pack, Pack.class, "montantJournalier", BigDecimal.valueOf(700));
        setChamp(pack, Pack.class, "seuilEligibiliteCnps", BigDecimal.valueOf(10500));

        adhesionOuverte = new Adhesion(adherentId, packId, LocalDate.of(2026, 1, 1), "Adhésion initiale", UUID.randomUUID());
    }

    private void setChamp(Object cible, Class<?> classeDeclaration, String nom, Object valeur) throws Exception {
        Field champ = classeDeclaration.getDeclaredField(nom);
        champ.setAccessible(true);
        champ.set(cible, valeur);
    }

    private <T> T instancierParConstructeurProtege(Class<T> classe) throws Exception {
        var constructeur = classe.getDeclaredConstructor();
        constructeur.setAccessible(true);
        return constructeur.newInstance();
    }

    @Test
    void imputerArrondiVersLeBasEtPersisteUnePeriodeCouvrantLesJoursAchetes() {
        UUID affectationId = UUID.randomUUID();
        BigDecimal montant = BigDecimal.valueOf(2150); // 700 * 3 = 2100, reliquat 50 non imputé.
        when(jdbcTemplate.queryForMap(anyString(), eq(affectationId)))
                .thenReturn(Map.of("montant", montant, "adherent_id", adherentId));
        when(adherentRepository.findById(adherentId)).thenReturn(Optional.of(adherent));
        when(adhesionRepository.findByAdherentIdAndDateFinIsNull(adherentId)).thenReturn(Optional.of(adhesionOuverte));
        when(packRepository.findById(packId)).thenReturn(Optional.of(pack));
        when(periodeDroitsRepository.findFirstByAdherentIdAndStatutNotOrderByDateFinDesc(adherentId, StatutPeriode.ANNULEE))
                .thenReturn(Optional.empty());
        when(periodeDroitsRepository.rechercherChevauchement(eq(adherentId), any(), any())).thenReturn(List.of());
        lenient().when(serviceParametre.estValide("TRAITEMENT_SURPAIEMENT")).thenReturn(false);
        when(periodeDroitsRepository.save(any(PeriodeDroits.class))).thenAnswer(inv -> inv.getArgument(0));

        List<PeriodeDroitsDto> resultat = service.imputer(affectationId);

        assertThat(resultat).hasSize(1);
        PeriodeDroitsDto periode = resultat.get(0);
        assertThat(periode.joursCouverts()).isEqualTo(3);
        assertThat(periode.dateDebut()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(periode.dateFin()).isEqualTo(LocalDate.of(2026, 1, 3));
        assertThat(periode.montantImpute()).isEqualByComparingTo(montant);

        ArgumentCaptor<PeriodeDroits> captor = ArgumentCaptor.forClass(PeriodeDroits.class);
        verify(periodeDroitsRepository).save(captor.capture());
        assertThat(captor.getValue().getJoursCouverts()).isEqualTo(3);
    }

    @Test
    void imputationSuivantePartDeLaFinDeLaDernierePeriodeCouvertePasDeLaDateDuPaiement() {
        UUID affectationId = UUID.randomUUID();
        BigDecimal montant = BigDecimal.valueOf(1400); // 700 * 2, exact.
        when(jdbcTemplate.queryForMap(anyString(), eq(affectationId)))
                .thenReturn(Map.of("montant", montant, "adherent_id", adherentId));
        when(adherentRepository.findById(adherentId)).thenReturn(Optional.of(adherent));
        when(adhesionRepository.findByAdherentIdAndDateFinIsNull(adherentId)).thenReturn(Optional.of(adhesionOuverte));
        when(packRepository.findById(packId)).thenReturn(Optional.of(pack));

        PeriodeDroits derniere = new PeriodeDroits(adherentId, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 3),
                3, BigDecimal.valueOf(2150), packId, UUID.randomUUID(), "test");
        when(periodeDroitsRepository.findFirstByAdherentIdAndStatutNotOrderByDateFinDesc(adherentId, StatutPeriode.ANNULEE))
                .thenReturn(Optional.of(derniere));
        when(periodeDroitsRepository.rechercherChevauchement(eq(adherentId), any(), any())).thenReturn(List.of());
        when(periodeDroitsRepository.save(any(PeriodeDroits.class))).thenAnswer(inv -> inv.getArgument(0));

        List<PeriodeDroitsDto> resultat = service.imputer(affectationId);

        assertThat(resultat).hasSize(1);
        // La date de paiement (non fournie ici) n'intervient jamais : le point de départ est bien
        // dateFin(dernière période) + 1 jour, pas "aujourd'hui" ni une quelconque date de paiement.
        assertThat(resultat.get(0).dateDebut()).isEqualTo(LocalDate.of(2026, 1, 4));
        assertThat(resultat.get(0).dateFin()).isEqualTo(LocalDate.of(2026, 1, 5));
        assertThat(resultat.get(0).joursCouverts()).isEqualTo(2);
    }

    @Test
    void imputerRefuseUnChevauchementDePeriodes() {
        UUID affectationId = UUID.randomUUID();
        BigDecimal montant = BigDecimal.valueOf(700);
        when(jdbcTemplate.queryForMap(anyString(), eq(affectationId)))
                .thenReturn(Map.of("montant", montant, "adherent_id", adherentId));
        when(adherentRepository.findById(adherentId)).thenReturn(Optional.of(adherent));
        when(adhesionRepository.findByAdherentIdAndDateFinIsNull(adherentId)).thenReturn(Optional.of(adhesionOuverte));
        when(packRepository.findById(packId)).thenReturn(Optional.of(pack));
        when(periodeDroitsRepository.findFirstByAdherentIdAndStatutNotOrderByDateFinDesc(adherentId, StatutPeriode.ANNULEE))
                .thenReturn(Optional.empty());
        PeriodeDroits chevauchante = new PeriodeDroits(adherentId, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 1),
                1, montant, packId, UUID.randomUUID(), "test");
        when(periodeDroitsRepository.rechercherChevauchement(eq(adherentId), any(), any())).thenReturn(List.of(chevauchante));

        assertThatThrownBy(() -> service.imputer(affectationId))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "DROITS_CHEVAUCHEMENT_PERIODE");
    }

    @Test
    void imputerNeCreeAucunePeriodeSiLeMontantEstInferieurAUneJournee() {
        UUID affectationId = UUID.randomUUID();
        BigDecimal montant = BigDecimal.valueOf(500); // < 700, aucune journée entière.
        when(jdbcTemplate.queryForMap(anyString(), eq(affectationId)))
                .thenReturn(Map.of("montant", montant, "adherent_id", adherentId));
        when(adherentRepository.findById(adherentId)).thenReturn(Optional.of(adherent));
        when(adhesionRepository.findByAdherentIdAndDateFinIsNull(adherentId)).thenReturn(Optional.of(adhesionOuverte));
        when(packRepository.findById(packId)).thenReturn(Optional.of(pack));
        when(periodeDroitsRepository.findFirstByAdherentIdAndStatutNotOrderByDateFinDesc(adherentId, StatutPeriode.ANNULEE))
                .thenReturn(Optional.empty());

        List<PeriodeDroitsDto> resultat = service.imputer(affectationId);

        assertThat(resultat).isEmpty();
        verify(periodeDroitsRepository, never()).save(any());
    }

    @Test
    void recalculerRefusePourUnRoleAutreQueDafOuSuperAdmin() throws Exception {
        Utilisateur gestionnaire = new Utilisateur("gest.droits", "hash", "Gestionnaire");
        Role roleGestionnaire = roleAvecCode("GESTIONNAIRE_COMPTE");
        gestionnaire.ajouterRole(roleGestionnaire);

        assertThatThrownBy(() -> service.recalculer(adherentId, "Motif valable", gestionnaire))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasFieldOrPropertyWithValue("code", "DROITS_RECALCUL_RESERVE");
    }

    @Test
    void recalculerExigeUnMotif() throws Exception {
        Utilisateur daf = new Utilisateur("daf.droits", "hash", "DAF");
        daf.ajouterRole(roleAvecCode("DAF"));

        assertThatThrownBy(() -> service.recalculer(adherentId, "  ", daf))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "DROITS_MOTIF_REQUIS");
    }

    private Role roleAvecCode(String code) throws Exception {
        Role role = instancierParConstructeurProtege(Role.class);
        Field champCode = Role.class.getDeclaredField("code");
        champCode.setAccessible(true);
        champCode.set(role, code);
        return role;
    }
}
