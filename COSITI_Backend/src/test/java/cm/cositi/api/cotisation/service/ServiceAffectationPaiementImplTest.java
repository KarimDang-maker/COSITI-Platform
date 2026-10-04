package cm.cositi.api.cotisation.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.cotisation.dto.LigneAffectationDto;
import cm.cositi.api.cotisation.entite.ComposanteAffectation;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.repository.AffectationPaiementRepository;
import cm.cositi.api.cotisation.repository.ComposanteAffectationRepository;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceAffectationPaiementImplTest {

    private static final BigDecimal MINIMUM = new BigDecimal("700");

    @Mock
    private AffectationPaiementRepository affectationRepository;
    @Mock
    private PaiementRepository paiementRepository;
    @Mock
    private ComposanteAffectationRepository composanteRepository;
    @Mock
    private ServiceParametre serviceParametre;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private ServiceAffectationPaiementImpl service;
    private Utilisateur auteur;

    @BeforeEach
    void setUp() throws Exception {
        service = new ServiceAffectationPaiementImpl(affectationRepository, paiementRepository, composanteRepository,
                serviceParametre, serviceAudit, jdbcTemplate);
        auteur = new Utilisateur("daf1", "hash", "DAF Un");
        setId(auteur, UUID.randomUUID());
    }

    // ------------------------------------------------------------------ Répartition confirmée (REPARTITION_VERSEMENT)

    @Test
    void parDefautSevenCentsVersLaSecuriteSocialeEtLeResteVersLEpargne() throws Exception {
        Paiement paiement = paiement(1000);
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM);

        var r = service.calculerRepartition(paiement);

        assertThat(r.securiteSociale()).isEqualByComparingTo("700");
        assertThat(r.epargne()).isEqualByComparingTo("300");
        assertThat(r.regle()).isEqualTo(ServiceAffectationPaiementImpl.REGLE_DEFAUT);
    }

    @Test
    void unPaiementInferieurAuMinimumEstRefuse() throws Exception {
        Paiement paiement = paiement(500);
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM);

        assertThatThrownBy(() -> service.calculerRepartition(paiement))
                .isInstanceOf(ExceptionConflit.class)
                .hasFieldOrPropertyWithValue("code", "PAIEMENT_MONTANT_INFERIEUR_MINIMUM_SECURITE_SOCIALE");
    }

    @Test
    @SuppressWarnings("unchecked")
    void laPreferenceDeLAdherentSAppliqueSurLeMontantDeReference() throws Exception {
        Paiement paiement = paiement(1000);
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM);
        List<Object> preference = List.of(new ServiceAffectationPaiementImpl.Repartition(new BigDecimal("800"),
                new BigDecimal("200"), ServiceAffectationPaiementImpl.REGLE_PREFERENCE));
        when(jdbcTemplate.query(contains("preference_allocation_adherent"), any(RowMapper.class), any(), any()))
                .thenReturn(preference);

        var r = service.calculerRepartition(paiement);

        assertThat(r.securiteSociale()).isEqualByComparingTo("800");
        assertThat(r.regle()).isEqualTo(ServiceAffectationPaiementImpl.REGLE_PREFERENCE);
    }

    @Test
    @SuppressWarnings("unchecked")
    void laRecommandationSAppliqueAuDelaDeMilleFcfa() throws Exception {
        Paiement paiement = paiement(2000);
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM);
        List<Object> recommandation = List.of(new ServiceAffectationPaiementImpl.Repartition(new BigDecimal("1500"),
                new BigDecimal("500"), ServiceAffectationPaiementImpl.REGLE_RECOMMANDATION));
        when(jdbcTemplate.query(contains("recommandation_allocation_paiement"), any(RowMapper.class), any()))
                .thenReturn(recommandation);

        var r = service.calculerRepartition(paiement);

        assertThat(r.securiteSociale()).isEqualByComparingTo("1500");
        assertThat(r.epargne()).isEqualByComparingTo("500");
        assertThat(r.regle()).isEqualTo(ServiceAffectationPaiementImpl.REGLE_RECOMMANDATION);
    }

    @Test
    @SuppressWarnings("unchecked")
    void uneRecommandationSousLeMinimumEstIgnoree() throws Exception {
        Paiement paiement = paiement(2000);
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM);
        List<Object> recommandation = List.of(new ServiceAffectationPaiementImpl.Repartition(new BigDecimal("500"),
                new BigDecimal("1500"), ServiceAffectationPaiementImpl.REGLE_RECOMMANDATION));
        when(jdbcTemplate.query(contains("recommandation_allocation_paiement"), any(RowMapper.class), any()))
                .thenReturn(recommandation);

        var r = service.calculerRepartition(paiement);

        assertThat(r.securiteSociale()).isEqualByComparingTo("700");
        assertThat(r.epargne()).isEqualByComparingTo("1300");
        assertThat(r.regle()).isEqualTo(ServiceAffectationPaiementImpl.REGLE_DEFAUT);
    }

    @Test
    void affecterCreeDeuxLignesSecuriteSocialeEtEpargne() throws Exception {
        Paiement paiement = paiement(1000);
        when(affectationRepository.findByPaiementId(paiement.getId())).thenReturn(List.of());
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM);
        ComposanteAffectation cnps = composanteAvecId("CNPS");
        ComposanteAffectation epargne = composanteAvecId("EPARGNE");
        when(composanteRepository.findByCode("CNPS")).thenReturn(Optional.of(cnps));
        when(composanteRepository.findByCode("EPARGNE")).thenReturn(Optional.of(epargne));
        when(affectationRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        var resultat = service.affecter(paiement.getId(), auteur);

        assertThat(resultat).hasSize(2);
        assertThat(resultat.get(0).montant()).isEqualByComparingTo("700");
        assertThat(resultat.get(1).montant()).isEqualByComparingTo("300");
        assertThat(resultat).allMatch(a -> ServiceAffectationPaiementImpl.REGLE_DEFAUT.equals(a.regleAppliquee()));
    }

    @Test
    void affecterAuMinimumExactNeCreeQueLaLigneSecuriteSociale() throws Exception {
        Paiement paiement = paiement(700);
        when(affectationRepository.findByPaiementId(paiement.getId())).thenReturn(List.of());
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM);
        ComposanteAffectation cnps = composanteAvecId("CNPS");
        when(composanteRepository.findByCode("CNPS")).thenReturn(Optional.of(cnps));
        when(affectationRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        var resultat = service.affecter(paiement.getId(), auteur);

        assertThat(resultat).hasSize(1);
        assertThat(resultat.get(0).montant()).isEqualByComparingTo("700");
    }

    @Test
    void affecterEstIdempotentSiDesAffectationsExistentDeja() throws Exception {
        Paiement paiement = paiement(1000);
        var existante = new cm.cositi.api.cotisation.entite.AffectationPaiement(
                paiement.getId(), UUID.randomUUID(), BigDecimal.valueOf(1000), "PAR_DEFAUT_COOPERATIVE_NON_VALIDEE", "daf1");
        when(affectationRepository.findByPaiementId(paiement.getId())).thenReturn(List.of(existante));

        var resultat = service.affecter(paiement.getId(), auteur);

        assertThat(resultat).hasSize(1);
    }

    // ------------------------------------------------------------------ Affectation manuelle

    @Test
    void affecterManuellementRefuseSiLaSommeNeCorrespondPasAuMontant() throws Exception {
        Paiement paiement = paiement(1000);
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));
        List<LigneAffectationDto> lignes = List.of(new LigneAffectationDto(UUID.randomUUID(), BigDecimal.valueOf(500)));

        assertThatThrownBy(() -> service.affecterManuellement(paiement.getId(), lignes, auteur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "AFFECTATION_MONTANT_INCOHERENT");
    }

    @Test
    void affecterManuellementRefuseUneComposanteHorsSecuriteSocialeEtEpargne() throws Exception {
        Paiement paiement = paiement(1000);
        ComposanteAffectation cooperative = composanteAvecId("COOPERATIVE");
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM);
        when(composanteRepository.findById(cooperative.getId())).thenReturn(Optional.of(cooperative));
        List<LigneAffectationDto> lignes = List.of(new LigneAffectationDto(cooperative.getId(), BigDecimal.valueOf(1000)));

        assertThatThrownBy(() -> service.affecterManuellement(paiement.getId(), lignes, auteur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "AFFECTATION_COMPOSANTE_NON_AUTORISEE");
    }

    @Test
    void affecterManuellementRefuseUneSecuriteSocialeSousLeMinimum() throws Exception {
        Paiement paiement = paiement(1000);
        ComposanteAffectation cnps = composanteAvecId("CNPS");
        ComposanteAffectation epargne = composanteAvecId("EPARGNE");
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM);
        when(composanteRepository.findById(cnps.getId())).thenReturn(Optional.of(cnps));
        when(composanteRepository.findById(epargne.getId())).thenReturn(Optional.of(epargne));
        List<LigneAffectationDto> lignes = List.of(new LigneAffectationDto(cnps.getId(), BigDecimal.valueOf(600)),
                new LigneAffectationDto(epargne.getId(), BigDecimal.valueOf(400)));

        assertThatThrownBy(() -> service.affecterManuellement(paiement.getId(), lignes, auteur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "AFFECTATION_SECURITE_SOCIALE_INSUFFISANTE");
    }

    // ------------------------------------------------------------------ Outils

    private Paiement paiement(int montant) throws Exception {
        Paiement p = new Paiement(UUID.randomUUID(), "REC-000001", LocalDate.now(), BigDecimal.valueOf(montant),
                "ESPECES", null, "COTISATION", null, null);
        setId(p, UUID.randomUUID());
        return p;
    }

    private void setId(Object entite, UUID id) throws Exception {
        Field champ = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
        champ.setAccessible(true);
        champ.set(entite, id);
    }

    private ComposanteAffectation composanteAvecId(String code) {
        try {
            var constructeur = ComposanteAffectation.class.getDeclaredConstructor();
            constructeur.setAccessible(true);
            ComposanteAffectation c = constructeur.newInstance();
            Field champId = ComposanteAffectation.class.getDeclaredField("id");
            champId.setAccessible(true);
            champId.set(c, UUID.randomUUID());
            Field champCode = ComposanteAffectation.class.getDeclaredField("code");
            champCode.setAccessible(true);
            champCode.set(c, code);
            return c;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
