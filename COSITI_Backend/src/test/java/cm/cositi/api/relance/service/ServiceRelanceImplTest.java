package cm.cositi.api.relance.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.commun.entite.EntiteAuditable;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.relance.dto.CampagneRelanceDto;
import cm.cositi.api.relance.dto.CreationCampagneDto;
import cm.cositi.api.relance.dto.CreationRelanceDto;
import cm.cositi.api.relance.dto.RelanceDto;
import cm.cositi.api.relance.entite.CampagneRelance;
import cm.cositi.api.relance.entite.CanalRelance;
import cm.cositi.api.relance.entite.Relance;
import cm.cositi.api.relance.entite.ResultatRelance;
import cm.cositi.api.relance.entite.StatutCampagne;
import cm.cositi.api.relance.repository.CampagneRelanceRepository;
import cm.cositi.api.relance.repository.RelanceRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Relances et campagnes (jalon J8).
 *
 * <p>L'essentiel est ici défensif : une relance ne s'enregistre que dans son périmètre, une promesse ne se
 * perd pas faute de date de suivi, et une campagne fermée n'accepte plus de contact.</p>
 */
@ExtendWith(MockitoExtension.class)
class ServiceRelanceImplTest {

    @Mock
    private RelanceRepository relanceRepository;
    @Mock
    private CampagneRelanceRepository campagneRepository;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ServiceAudit serviceAudit;

    private ServiceRelanceImpl service;
    private Utilisateur agent;
    private UUID adherentId;

    @BeforeEach
    void setUp() {
        service = new ServiceRelanceImpl(relanceRepository, campagneRepository, perimetre, serviceAudit,
                new ObjectMapper());
        agent = new Utilisateur("agent.terrain", "hash", "Agent Terrain");
        forcerId(agent, UUID.randomUUID());
        adherentId = UUID.randomUUID();

        lenient().when(relanceRepository.save(any(Relance.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(campagneRepository.save(any(CampagneRelance.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void enregistre_une_relance_dans_le_perimetre_de_son_auteur() {
        CreationRelanceDto dto = new CreationRelanceDto(adherentId, null, CanalRelance.APPEL,
                ResultatRelance.PAIEMENT, null, "A payé le jour même");

        RelanceDto resultat = service.enregistrer(dto, agent);

        assertThat(resultat.adherentId()).isEqualTo(adherentId);
        assertThat(resultat.canal()).isEqualTo(CanalRelance.APPEL);
        assertThat(resultat.responsableUtilisateurId()).isEqualTo(agent.getId());
        verify(perimetre).verifierAccesAdherent(agent, adherentId);
    }

    @Test
    void refuse_une_relance_hors_perimetre() {
        doThrow(new ExceptionAutorisation("PERIMETRE_ADHERENT_REFUSE", "Hors périmètre."))
                .when(perimetre).verifierAccesAdherent(agent, adherentId);

        assertThatThrownBy(() -> service.enregistrer(new CreationRelanceDto(adherentId, null, CanalRelance.SMS,
                ResultatRelance.REFUS, null, null), agent))
                .isInstanceOf(ExceptionAutorisation.class);

        verify(relanceRepository, never()).save(any());
    }

    @Test
    void exige_une_date_de_suivi_quand_le_resultat_appelle_un_nouveau_contact() {
        // Une promesse sans date de rappel est une promesse perdue.
        assertThatThrownBy(() -> service.enregistrer(new CreationRelanceDto(adherentId, null, CanalRelance.VISITE,
                ResultatRelance.PROMESSE, null, "Promet de payer"), agent))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("prochaine action");
    }

    @Test
    void n_exige_pas_de_date_de_suivi_pour_un_resultat_terminal() {
        RelanceDto resultat = service.enregistrer(new CreationRelanceDto(adherentId, null, CanalRelance.APPEL,
                ResultatRelance.DEMENAGE, null, "A quitté le quartier"), agent);

        assertThat(resultat.prochaineActionLe()).isNull();
    }

    @Test
    void refuse_une_date_de_suivi_dans_le_passe() {
        assertThatThrownBy(() -> service.enregistrer(new CreationRelanceDto(adherentId, null, CanalRelance.APPEL,
                ResultatRelance.PROMESSE, LocalDate.now().minusDays(1), null), agent))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("passé");
    }

    @Test
    void refuse_de_rattacher_une_relance_a_une_campagne_cloturee() {
        UUID campagneId = UUID.randomUUID();
        CampagneRelance campagne = new CampagneRelance("Retards de septembre", "{}", LocalDate.now(), "gestionnaire");
        campagne.cloturer(LocalDate.now());
        when(campagneRepository.findById(campagneId)).thenReturn(Optional.of(campagne));

        assertThatThrownBy(() -> service.enregistrer(new CreationRelanceDto(adherentId, campagneId,
                CanalRelance.SMS, ResultatRelance.INJOIGNABLE, LocalDate.now().plusDays(3), null), agent))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("CLOTUREE");

        verify(relanceRepository, never()).save(any());
    }

    @Test
    void cree_une_campagne_en_conservant_ses_criteres_tels_quels() {
        CampagneRelanceDto campagne = service.creerCampagne(
                new CreationCampagneDto("Retards > 60 jours", Map.of("joursRetardMin", 60), LocalDate.now()),
                agent);

        assertThat(campagne.libelle()).isEqualTo("Retards > 60 jours");
        assertThat(campagne.statut()).isEqualTo(StatutCampagne.ACTIVE);
        // Le critère est stocké tel quel : c'est une trace, pas un moteur de ciblage.
        assertThat(campagne.critereJson()).contains("joursRetardMin").contains("60");
        assertThat(campagne.nbRelances()).isZero();
    }

    @Test
    void une_campagne_cloturee_ne_change_plus_de_statut() {
        UUID campagneId = UUID.randomUUID();
        CampagneRelance campagne = new CampagneRelance("Campagne close", "{}", LocalDate.now(), "gestionnaire");
        campagne.cloturer(LocalDate.now());
        when(campagneRepository.findById(campagneId)).thenReturn(Optional.of(campagne));

        assertThatThrownBy(() -> service.changerStatutCampagne(campagneId, StatutCampagne.ACTIVE, agent))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("clôturée");
    }

    @Test
    void suspendre_puis_reactiver_une_campagne() {
        UUID campagneId = UUID.randomUUID();
        CampagneRelance campagne = new CampagneRelance("Campagne active", "{}", LocalDate.now(), "gestionnaire");
        when(campagneRepository.findById(campagneId)).thenReturn(Optional.of(campagne));
        when(relanceRepository.countByCampagneId(campagneId)).thenReturn(3L);

        assertThat(service.changerStatutCampagne(campagneId, StatutCampagne.SUSPENDUE, agent).statut())
                .isEqualTo(StatutCampagne.SUSPENDUE);
        assertThat(service.changerStatutCampagne(campagneId, StatutCampagne.ACTIVE, agent).statut())
                .isEqualTo(StatutCampagne.ACTIVE);
    }

    private static void forcerId(Object entite, UUID id) {
        try {
            var champ = EntiteAuditable.class.getDeclaredField("id");
            champ.setAccessible(true);
            champ.set(entite, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
