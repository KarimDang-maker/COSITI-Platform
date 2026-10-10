package cm.cositi.api.cnps.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.cnps.dto.DeclarationCnpsDto;
import cm.cositi.api.cnps.entite.DeclarationCnps;
import cm.cositi.api.cnps.entite.DossierCnps;
import cm.cositi.api.cnps.entite.StatutDeclarationCnps;
import cm.cositi.api.cnps.repository.DeclarationCnpsRepository;
import cm.cositi.api.cnps.repository.DossierCnpsRepository;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Déclarations CNPS (jalon J7).
 *
 * <p>Le point le plus important est ce que le service <b>ne fait pas</b> : il n'applique ni taux ni assiette
 * reconstituée tant que {@code ASSIETTE_CNPS} est marqué {@code [V]}. Un montant faux mais crédible serait
 * plus dangereux qu'une absence de montant — d'où l'avertissement systématique, testé ici.</p>
 */
@ExtendWith(MockitoExtension.class)
class ServiceDeclarationCnpsImplTest {

    @Mock
    private DeclarationCnpsRepository declarationRepository;
    @Mock
    private DossierCnpsRepository dossierRepository;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ServiceParametre serviceParametre;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private ServiceDeclarationCnpsImpl service;

    private Utilisateur gestionnaire;
    private UUID dossierId;
    private UUID adherentId;
    private final YearMonth septembre = YearMonth.of(2026, 9);

    @BeforeEach
    void setUp() {
        service = new ServiceDeclarationCnpsImpl(declarationRepository, dossierRepository, perimetre,
                serviceParametre, serviceAudit, jdbcTemplate);
        gestionnaire = new Utilisateur("gestionnaire.test", "hash", "Gestionnaire Test");
        dossierId = UUID.randomUUID();
        adherentId = UUID.randomUUID();

        lenient().when(serviceParametre.estValide(ServiceDeclarationCnpsImpl.CLE_ASSIETTE)).thenReturn(false);
        lenient().when(declarationRepository.save(any(DeclarationCnps.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    /**
     * Le service interroge {@code periode_droits} avec trois paramètres liés (adhérent, fin de mois, début de
     * mois) — le nombre de {@code any()} doit correspondre exactement, sans quoi Mockito refuse le stub.
     */
    @SuppressWarnings("unchecked")
    private void montantsImputes(BigDecimal... montants) {
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(), any(), any()))
                .thenReturn(List.of(montants));
    }

    private DossierCnps dossier(BigDecimal revenuDeclare) {
        DossierCnps dossier = new DossierCnps(adherentId);
        dossier.setRevenuMensuelDeclare(revenuDeclare);
        when(dossierRepository.findById(dossierId)).thenReturn(Optional.of(dossier));
        return dossier;
    }

    @Test
    void prepare_une_declaration_a_partir_des_droits_imputes_sur_le_mois() {
        dossier(new BigDecimal("120000"));
        when(declarationRepository.findByDossierIdAndPeriodeMois(dossierId, LocalDate.of(2026, 9, 1)))
                .thenReturn(Optional.empty());
        montantsImputes(new BigDecimal("14000"), new BigDecimal("7000"));

        DeclarationCnpsDto dto = service.preparer(dossierId, septembre, gestionnaire);

        assertThat(dto.montantDeclare()).isEqualByComparingTo("21000");
        assertThat(dto.periodeMois()).isEqualTo(LocalDate.of(2026, 9, 1));
        assertThat(dto.statut()).isEqualTo(StatutDeclarationCnps.A_PRODUIRE);
    }

    @Test
    void n_applique_aucun_taux_ni_assiette_et_le_signale_tant_que_la_regle_n_est_pas_validee() {
        // Le revenu déclaré vaut 120 000 et le taux CNPS de référence 0,084 : si le service appliquait une
        // assiette, on lirait 10 080. Il doit lire les droits réellement imputés, et rien d'autre.
        dossier(new BigDecimal("120000"));
        when(declarationRepository.findByDossierIdAndPeriodeMois(any(), any())).thenReturn(Optional.empty());
        montantsImputes(new BigDecimal("21000"));

        DeclarationCnpsDto dto = service.preparer(dossierId, septembre, gestionnaire);

        assertThat(dto.montantDeclare()).isEqualByComparingTo("21000");
        assertThat(dto.avertissements()).anyMatch(a -> a.contains("ASSIETTE_CNPS"));
    }

    @Test
    void signale_aussi_l_absence_de_revenu_mensuel_declare() {
        dossier(null);
        when(declarationRepository.findByDossierIdAndPeriodeMois(any(), any())).thenReturn(Optional.empty());
        montantsImputes(new BigDecimal("7000"));

        DeclarationCnpsDto dto = service.preparer(dossierId, septembre, gestionnaire);

        assertThat(dto.avertissements()).anyMatch(a -> a.contains("revenu mensuel déclaré"));
    }

    @Test
    void preparer_deux_fois_le_meme_mois_ne_cree_pas_de_doublon() {
        dossier(new BigDecimal("120000"));
        DeclarationCnps existante = new DeclarationCnps(dossierId, LocalDate.of(2026, 9, 1),
                new BigDecimal("21000"), "gestionnaire.test");
        when(declarationRepository.findByDossierIdAndPeriodeMois(dossierId, LocalDate.of(2026, 9, 1)))
                .thenReturn(Optional.of(existante));

        DeclarationCnpsDto dto = service.preparer(dossierId, septembre, gestionnaire);

        assertThat(dto.montantDeclare()).isEqualByComparingTo("21000");
        verify(declarationRepository, never()).save(any());
    }

    @Test
    void refuse_une_periode_absente() {
        assertThatThrownBy(() -> service.preparer(dossierId, null, gestionnaire))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("période");
    }

    @Test
    void marque_une_declaration_transmise_avec_sa_date_et_son_accuse() {
        dossier(new BigDecimal("120000"));
        UUID declarationId = UUID.randomUUID();
        UUID accuseId = UUID.randomUUID();
        DeclarationCnps declaration = new DeclarationCnps(dossierId, LocalDate.of(2026, 9, 1),
                new BigDecimal("21000"), "gestionnaire.test");
        when(declarationRepository.findById(declarationId)).thenReturn(Optional.of(declaration));

        DeclarationCnpsDto dto = service.marquerTransmise(declarationId, accuseId, gestionnaire);

        assertThat(dto.statut()).isEqualTo(StatutDeclarationCnps.TRANSMISE);
        assertThat(dto.accuseDocumentId()).isEqualTo(accuseId);
        assertThat(dto.dateTransmission()).isEqualTo(LocalDate.now());

        ArgumentCaptor<DeclarationCnps> sauvee = ArgumentCaptor.forClass(DeclarationCnps.class);
        verify(declarationRepository).save(sauvee.capture());
        assertThat(sauvee.getValue().getStatut()).isEqualTo(StatutDeclarationCnps.TRANSMISE);
    }

    @Test
    void refuse_de_transmettre_deux_fois_la_meme_declaration() {
        dossier(new BigDecimal("120000"));
        UUID declarationId = UUID.randomUUID();
        DeclarationCnps declaration = new DeclarationCnps(dossierId, LocalDate.of(2026, 9, 1),
                new BigDecimal("21000"), "gestionnaire.test");
        declaration.marquerTransmise(null, LocalDate.of(2026, 10, 2));
        when(declarationRepository.findById(declarationId)).thenReturn(Optional.of(declaration));

        assertThatThrownBy(() -> service.marquerTransmise(declarationId, null, gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("TRANSMISE");
    }
}
