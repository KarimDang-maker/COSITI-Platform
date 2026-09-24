package cm.cositi.api.cotisation.service;

import cm.cositi.api.adherent.entite.PreferenceAllocationAdherent;
import cm.cositi.api.adherent.repository.PreferenceAllocationAdherentRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.cotisation.dto.LigneAffectationDto;
import cm.cositi.api.cotisation.entite.AffectationPaiement;
import cm.cositi.api.cotisation.entite.ComposanteAffectation;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.RecommandationAllocationPaiement;
import cm.cositi.api.cotisation.repository.AffectationPaiementRepository;
import cm.cositi.api.cotisation.repository.ComposanteAffectationRepository;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.cotisation.repository.RecommandationAllocationPaiementRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Correctif COSITI V1 §7-§8 : {@code affecter} ventile désormais chaque paiement en Sécurité Sociale
 * (composante {@code CNPS}) + Épargne (composante {@code EPARGNE}), au lieu de l'ancienne affectation
 * unique vers {@code COOPERATIVE} (règle {@code REPARTITION_VERSEMENT} avant sa validation par la COSITI).
 */
@ExtendWith(MockitoExtension.class)
class ServiceAffectationPaiementImplTest {

    private static final BigDecimal MINIMUM_SECURITE_SOCIALE = BigDecimal.valueOf(700);

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
    private RecommandationAllocationPaiementRepository recommandationRepository;
    @Mock
    private PreferenceAllocationAdherentRepository preferenceAllocationRepository;

    private ServiceAffectationPaiementImpl service;
    private Utilisateur auteur;
    private Paiement paiement;
    private ComposanteAffectation composanteCnps;
    private ComposanteAffectation composanteEpargne;

    @BeforeEach
    void setUp() throws Exception {
        service = new ServiceAffectationPaiementImpl(affectationRepository, paiementRepository, composanteRepository,
                serviceParametre, serviceAudit, recommandationRepository, preferenceAllocationRepository);

        auteur = new Utilisateur("daf1", "hash", "DAF Un");
        setId(auteur, UUID.randomUUID());

        paiement = new Paiement(UUID.randomUUID(), "REC-000001", LocalDate.now(), BigDecimal.valueOf(1000),
                "ESPECES", null, "COTISATION", null, null);
        setId(paiement, UUID.randomUUID());

        composanteCnps = composanteAvecId("CNPS");
        composanteEpargne = composanteAvecId("EPARGNE");
    }

    private void setId(Object entite, UUID id) throws Exception {
        Field champ = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
        champ.setAccessible(true);
        champ.set(entite, id);
    }

    @Test
    void affecterAppliqueLaRepartitionParDefautQuandAucunePreferenceNiRecommandation() {
        Paiement paiementMille = new Paiement(UUID.randomUUID(), "REC-000010", LocalDate.now(), BigDecimal.valueOf(1000),
                "ESPECES", null, "COTISATION", null, null);
        when(affectationRepository.findByPaiementId(paiementMille.getId())).thenReturn(List.of());
        when(paiementRepository.findById(paiementMille.getId())).thenReturn(Optional.of(paiementMille));
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM_SECURITE_SOCIALE);
        when(recommandationRepository.findByPaiementId(paiementMille.getId())).thenReturn(Optional.empty());
        when(preferenceAllocationRepository.findByAdherentIdAndActifTrue(paiementMille.getAdherentId()))
                .thenReturn(Optional.empty());
        when(composanteRepository.findByCode("CNPS")).thenReturn(Optional.of(composanteCnps));
        when(composanteRepository.findByCode("EPARGNE")).thenReturn(Optional.of(composanteEpargne));
        when(composanteRepository.findAllById(anyList())).thenReturn(List.of(composanteCnps, composanteEpargne));
        when(affectationRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        var resultat = service.affecter(paiementMille.getId(), auteur);

        assertThat(resultat).hasSize(2);
        var secuSociale = resultat.stream().filter(a -> "CNPS".equals(a.composanteCode())).findFirst().orElseThrow();
        var epargne = resultat.stream().filter(a -> "EPARGNE".equals(a.composanteCode())).findFirst().orElseThrow();
        assertThat(secuSociale.montant()).isEqualByComparingTo(BigDecimal.valueOf(700));
        assertThat(epargne.montant()).isEqualByComparingTo(BigDecimal.valueOf(300));
        assertThat(secuSociale.regleAppliquee()).isEqualTo("SECURITE_SOCIALE_MINIMUM_700_PUIS_EPARGNE");
    }

    @Test
    void affecterNeCreeAucuneLigneEpargneQuandLeMontantEgaleLePlancher() {
        Paiement paiement700 = new Paiement(UUID.randomUUID(), "REC-000011", LocalDate.now(), BigDecimal.valueOf(700),
                "ESPECES", null, "COTISATION", null, null);
        when(affectationRepository.findByPaiementId(paiement700.getId())).thenReturn(List.of());
        when(paiementRepository.findById(paiement700.getId())).thenReturn(Optional.of(paiement700));
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM_SECURITE_SOCIALE);
        when(recommandationRepository.findByPaiementId(paiement700.getId())).thenReturn(Optional.empty());
        when(preferenceAllocationRepository.findByAdherentIdAndActifTrue(paiement700.getAdherentId()))
                .thenReturn(Optional.empty());
        when(composanteRepository.findByCode("CNPS")).thenReturn(Optional.of(composanteCnps));
        when(composanteRepository.findAllById(anyList())).thenReturn(List.of(composanteCnps));
        when(affectationRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        var resultat = service.affecter(paiement700.getId(), auteur);

        assertThat(resultat).hasSize(1);
        assertThat(resultat.get(0).composanteCode()).isEqualTo("CNPS");
        assertThat(resultat.get(0).montant()).isEqualByComparingTo(BigDecimal.valueOf(700));
    }

    @Test
    void affecterUtiliseLaRecommandationStructureeQuandElleExiste() {
        Paiement paiement1300 = new Paiement(UUID.randomUUID(), "REC-000012", LocalDate.now(), BigDecimal.valueOf(1300),
                "ESPECES", null, "COTISATION", null, null);
        when(affectationRepository.findByPaiementId(paiement1300.getId())).thenReturn(List.of());
        when(paiementRepository.findById(paiement1300.getId())).thenReturn(Optional.of(paiement1300));
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM_SECURITE_SOCIALE);
        RecommandationAllocationPaiement recommandation = new RecommandationAllocationPaiement(paiement1300.getId(),
                BigDecimal.valueOf(900), BigDecimal.valueOf(400), auteur.getId());
        when(recommandationRepository.findByPaiementId(paiement1300.getId())).thenReturn(Optional.of(recommandation));
        when(composanteRepository.findByCode("CNPS")).thenReturn(Optional.of(composanteCnps));
        when(composanteRepository.findByCode("EPARGNE")).thenReturn(Optional.of(composanteEpargne));
        when(composanteRepository.findAllById(anyList())).thenReturn(List.of(composanteCnps, composanteEpargne));
        when(affectationRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        var resultat = service.affecter(paiement1300.getId(), auteur);

        var secuSociale = resultat.stream().filter(a -> "CNPS".equals(a.composanteCode())).findFirst().orElseThrow();
        var epargne = resultat.stream().filter(a -> "EPARGNE".equals(a.composanteCode())).findFirst().orElseThrow();
        assertThat(secuSociale.montant()).isEqualByComparingTo(BigDecimal.valueOf(900));
        assertThat(epargne.montant()).isEqualByComparingTo(BigDecimal.valueOf(400));
        assertThat(secuSociale.regleAppliquee()).isEqualTo("RECOMMANDATION_STRUCTUREE_ADHERENT");
    }

    @Test
    void affecterUtiliseLaPreferenceDuDossierQuandSonMontantDeReferenceCorrespond() {
        when(affectationRepository.findByPaiementId(paiement.getId())).thenReturn(List.of());
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM_SECURITE_SOCIALE);
        when(recommandationRepository.findByPaiementId(paiement.getId())).thenReturn(Optional.empty());
        PreferenceAllocationAdherent preference = new PreferenceAllocationAdherent(paiement.getAdherentId(),
                UUID.randomUUID(), BigDecimal.valueOf(1000), BigDecimal.valueOf(800), BigDecimal.valueOf(200),
                LocalDate.now(), auteur.getId());
        when(preferenceAllocationRepository.findByAdherentIdAndActifTrue(paiement.getAdherentId()))
                .thenReturn(Optional.of(preference));
        when(composanteRepository.findByCode("CNPS")).thenReturn(Optional.of(composanteCnps));
        when(composanteRepository.findByCode("EPARGNE")).thenReturn(Optional.of(composanteEpargne));
        when(composanteRepository.findAllById(anyList())).thenReturn(List.of(composanteCnps, composanteEpargne));
        when(affectationRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        var resultat = service.affecter(paiement.getId(), auteur);

        var secuSociale = resultat.stream().filter(a -> "CNPS".equals(a.composanteCode())).findFirst().orElseThrow();
        var epargne = resultat.stream().filter(a -> "EPARGNE".equals(a.composanteCode())).findFirst().orElseThrow();
        assertThat(secuSociale.montant()).isEqualByComparingTo(BigDecimal.valueOf(800));
        assertThat(epargne.montant()).isEqualByComparingTo(BigDecimal.valueOf(200));
        assertThat(secuSociale.regleAppliquee()).isEqualTo("PREFERENCE_ALLOCATION_ADHERENT");
    }

    @Test
    void affecterIgnoreLaPreferenceSiSonMontantDeReferenceNeCorrespondPasEtAppliqueLeDefaut() {
        when(affectationRepository.findByPaiementId(paiement.getId())).thenReturn(List.of());
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM_SECURITE_SOCIALE);
        when(recommandationRepository.findByPaiementId(paiement.getId())).thenReturn(Optional.empty());
        // Préférence référencée pour 2000 FCFA, mais ce paiement-ci est de 1000 FCFA : la proportion
        // n'aurait pas de sens, donc le défaut s'applique plutôt que d'inventer une mise à l'échelle.
        PreferenceAllocationAdherent preference = new PreferenceAllocationAdherent(paiement.getAdherentId(),
                UUID.randomUUID(), BigDecimal.valueOf(2000), BigDecimal.valueOf(1500), BigDecimal.valueOf(500),
                LocalDate.now(), auteur.getId());
        when(preferenceAllocationRepository.findByAdherentIdAndActifTrue(paiement.getAdherentId()))
                .thenReturn(Optional.of(preference));
        when(composanteRepository.findByCode("CNPS")).thenReturn(Optional.of(composanteCnps));
        when(composanteRepository.findByCode("EPARGNE")).thenReturn(Optional.of(composanteEpargne));
        when(composanteRepository.findAllById(anyList())).thenReturn(List.of(composanteCnps, composanteEpargne));
        when(affectationRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        var resultat = service.affecter(paiement.getId(), auteur);

        var secuSociale = resultat.stream().filter(a -> "CNPS".equals(a.composanteCode())).findFirst().orElseThrow();
        assertThat(secuSociale.montant()).isEqualByComparingTo(BigDecimal.valueOf(700));
        assertThat(secuSociale.regleAppliquee()).isEqualTo("SECURITE_SOCIALE_MINIMUM_700_PUIS_EPARGNE");
    }

    @Test
    void affecterRefuseSiLaRecommandationDescendSousLePlancher() {
        when(affectationRepository.findByPaiementId(paiement.getId())).thenReturn(List.of());
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));
        when(serviceParametre.decimal("MONTANT_MINIMUM_SECURITE_SOCIALE")).thenReturn(MINIMUM_SECURITE_SOCIALE);
        RecommandationAllocationPaiement recommandationInvalide = new RecommandationAllocationPaiement(paiement.getId(),
                BigDecimal.valueOf(600), BigDecimal.valueOf(400), auteur.getId());
        when(recommandationRepository.findByPaiementId(paiement.getId())).thenReturn(Optional.of(recommandationInvalide));

        assertThatThrownBy(() -> service.affecter(paiement.getId(), auteur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "ALLOCATION_SECURITE_SOCIALE_INSUFFISANTE");
    }

    @Test
    void affecterEstIdempotentSiDesAffectationsExistentDeja() {
        AffectationPaiement existante = new AffectationPaiement(paiement.getId(), composanteCnps.getId(),
                BigDecimal.valueOf(1000), "SECURITE_SOCIALE_MINIMUM_700_PUIS_EPARGNE", "daf1");
        when(affectationRepository.findByPaiementId(paiement.getId())).thenReturn(List.of(existante));
        lenient().when(composanteRepository.findAllById(anyList())).thenReturn(List.of(composanteCnps));

        var resultat = service.affecter(paiement.getId(), auteur);

        assertThat(resultat).hasSize(1);
    }

    @Test
    void affecterManuellementRefuseSiLaSommeNeCorrespondPasAuMontant() {
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));
        List<LigneAffectationDto> lignes = List.of(new LigneAffectationDto(UUID.randomUUID(), BigDecimal.valueOf(500)));

        assertThatThrownBy(() -> service.affecterManuellement(paiement.getId(), lignes, auteur))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "AFFECTATION_MONTANT_INCOHERENT");
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
