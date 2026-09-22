package cm.cositi.api.cotisation.service;

import cm.cositi.api.audit.ServiceAudit;
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

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceAffectationPaiementImplTest {

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

    private ServiceAffectationPaiementImpl service;
    private Utilisateur auteur;
    private Paiement paiement;

    @BeforeEach
    void setUp() throws Exception {
        service = new ServiceAffectationPaiementImpl(affectationRepository, paiementRepository, composanteRepository,
                serviceParametre, serviceAudit);

        auteur = new Utilisateur("daf1", "hash", "DAF Un");
        setId(auteur, UUID.randomUUID());

        paiement = new Paiement(UUID.randomUUID(), "REC-000001", LocalDate.now(), BigDecimal.valueOf(1000),
                "ESPECES", null, "COTISATION", null, null);
        setId(paiement, UUID.randomUUID());
    }

    private void setId(Object entite, UUID id) throws Exception {
        Field champ = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
        champ.setAccessible(true);
        champ.set(entite, id);
    }

    @Test
    void affecterAppliqueLaffectationUniqueParDefautCarLaRegleNestPasValidee() {
        when(affectationRepository.findByPaiementId(paiement.getId())).thenReturn(List.of());
        when(paiementRepository.findById(paiement.getId())).thenReturn(Optional.of(paiement));
        when(serviceParametre.estValide("REPARTITION_VERSEMENT")).thenReturn(false);

        ComposanteAffectation composante = composanteAvecId("COOPERATIVE");
        when(composanteRepository.findByCode("COOPERATIVE")).thenReturn(Optional.of(composante));
        when(affectationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var resultat = service.affecter(paiement.getId(), auteur);

        assertThat(resultat).hasSize(1);
        assertThat(resultat.get(0).montant()).isEqualByComparingTo(BigDecimal.valueOf(1000));
        assertThat(resultat.get(0).regleAppliquee()).isEqualTo("PAR_DEFAUT_COOPERATIVE_NON_VALIDEE");
    }

    @Test
    void affecterEstIdempotentSiDesAffectationsExistentDeja() throws Exception {
        cm.cositi.api.cotisation.entite.AffectationPaiement existante = new cm.cositi.api.cotisation.entite.AffectationPaiement(
                paiement.getId(), UUID.randomUUID(), BigDecimal.valueOf(1000), "PAR_DEFAUT_COOPERATIVE_NON_VALIDEE", "daf1");
        when(affectationRepository.findByPaiementId(paiement.getId())).thenReturn(List.of(existante));

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
