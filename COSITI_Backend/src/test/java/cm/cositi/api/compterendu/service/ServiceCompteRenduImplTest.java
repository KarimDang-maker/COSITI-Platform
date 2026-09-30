package cm.cositi.api.compterendu.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.entite.EntiteAuditable;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.compterendu.dto.CompteRenduDto;
import cm.cositi.api.compterendu.dto.ConsolidationDto;
import cm.cositi.api.compterendu.dto.CreationCompteRenduDto;
import cm.cositi.api.compterendu.entite.CompteRendu;
import cm.cositi.api.compterendu.entite.CompteRenduSource;
import cm.cositi.api.compterendu.entite.StatutCompteRendu;
import cm.cositi.api.compterendu.entite.TypeCompteRendu;
import cm.cositi.api.compterendu.repository.CompteRenduRepository;
import cm.cositi.api.compterendu.repository.CompteRenduSourceRepository;
import cm.cositi.api.notification.ServiceNotification;
import cm.cositi.api.securite.entite.Utilisateur;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Chaîne Agent → Gestionnaire → DGA (jalon J8, contrat `[A]`).
 *
 * <p>Couvre les cas de recette `REC-H04` (l'agent produit, le Gestionnaire reçoit), `REC-H05` (contrôle) et
 * `REC-H06` (consolidation puis transmission à la DGA), plus les refus qui protègent la chaîne :
 * auto-contrôle, consolidation d'un compte rendu non contrôlé, modification après transmission.</p>
 */
@ExtendWith(MockitoExtension.class)
class ServiceCompteRenduImplTest {

    @Mock
    private CompteRenduRepository compteRenduRepository;
    @Mock
    private CompteRenduSourceRepository sourceRepository;
    @Mock
    private ServiceNotification serviceNotification;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private ServiceCompteRenduImpl service;

    private Utilisateur agent;
    private Utilisateur gestionnaire;
    private UUID agentId;

    @BeforeEach
    void setUp() {
        service = new ServiceCompteRenduImpl(compteRenduRepository, sourceRepository, serviceNotification,
                serviceAudit, jdbcTemplate);

        agentId = UUID.randomUUID();
        agent = utilisateur("agent.terrain", UUID.randomUUID());
        agent.setAgentId(agentId);
        gestionnaire = utilisateur("gestionnaire", UUID.randomUUID());

        lenient().when(compteRenduRepository.save(any(CompteRendu.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(compteRenduRepository.saveAndFlush(any(CompteRendu.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(sourceRepository.sourcesDuConsolide(any())).thenReturn(List.of());
    }

    private CreationCompteRenduDto dto() {
        return new CreationCompteRenduDto(LocalDate.now().minusDays(7), LocalDate.now().minusDays(1),
                12, 9, 2, 5, new BigDecimal("35000"), "Tournée du marché central", "Deux adhérents injoignables");
    }

    @Test
    void un_agent_produit_un_compte_rendu_en_brouillon_rattache_a_son_propre_agent() {
        UUID zoneId = UUID.randomUUID();
        when(jdbcTemplate.queryForObject(anyString(), eq(UUID.class), eq(agentId))).thenReturn(zoneId);

        CompteRenduDto resultat = service.produire(dto(), agent);

        assertThat(resultat.type()).isEqualTo(TypeCompteRendu.TERRAIN);
        assertThat(resultat.statut()).isEqualTo(StatutCompteRendu.BROUILLON);
        assertThat(resultat.agentId()).isEqualTo(agentId);
        assertThat(resultat.zoneId()).isEqualTo(zoneId);
        assertThat(resultat.montantCollecte()).isEqualByComparingTo("35000");
        verify(serviceAudit).tracer(eq(TypeOperation.COMPTE_RENDU_CREATION), eq("compte_rendu"), any(), any(),
                any(), anyString());
    }

    @Test
    void refuse_un_compte_rendu_si_le_compte_n_est_rattache_a_aucun_agent() {
        Utilisateur sansAgent = utilisateur("sans.agent", UUID.randomUUID());

        assertThatThrownBy(() -> service.produire(dto(), sansAgent))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("aucun agent de terrain");
    }

    @Test
    void refuse_une_periode_a_venir() {
        CreationCompteRenduDto futur = new CreationCompteRenduDto(LocalDate.now().plusDays(1),
                LocalDate.now().plusDays(7), 0, 0, 0, 0, BigDecimal.ZERO, null, null);

        assertThatThrownBy(() -> service.produire(futur, agent))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("période écoulée");
    }

    @Test
    void transmettre_notifie_le_role_gestionnaire_et_fige_le_compte_rendu() {
        CompteRendu brouillon = compteRenduExistant(TypeCompteRendu.TERRAIN, StatutCompteRendu.BROUILLON,
                agent.getId());
        when(serviceNotification.notifierRoles(anyList(), anyString(), anyString(), anyString(), anyString(), any()))
                .thenReturn(1);

        CompteRenduDto resultat = service.transmettre(brouillon.getId(), agent);

        assertThat(resultat.statut()).isEqualTo(StatutCompteRendu.TRANSMIS);
        assertThat(resultat.transmisLe()).isNotNull();

        ArgumentCaptor<List<String>> roles = ArgumentCaptor.captor();
        verify(serviceNotification).notifierRoles(roles.capture(), anyString(), anyString(), anyString(),
                anyString(), any());
        assertThat(roles.getValue()).containsExactly("GESTIONNAIRE_COMPTE");
    }

    @Test
    void un_compte_rendu_transmis_n_est_plus_modifiable() {
        CompteRendu transmis = compteRenduExistant(TypeCompteRendu.TERRAIN, StatutCompteRendu.TRANSMIS,
                agent.getId());

        assertThatThrownBy(() -> service.modifier(transmis.getId(), dto(), agent))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("plus modifiable");
    }

    @Test
    void un_agent_ne_peut_pas_transmettre_le_compte_rendu_d_un_autre() {
        CompteRendu brouillon = compteRenduExistant(TypeCompteRendu.TERRAIN, StatutCompteRendu.BROUILLON,
                UUID.randomUUID());

        assertThatThrownBy(() -> service.transmettre(brouillon.getId(), agent))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasMessageContaining("n'est pas le vôtre");
    }

    @Test
    void le_gestionnaire_controle_un_compte_rendu_transmis_et_notifie_son_auteur() {
        CompteRendu transmis = compteRenduExistant(TypeCompteRendu.TERRAIN, StatutCompteRendu.TRANSMIS,
                agent.getId());

        CompteRenduDto resultat = service.controler(transmis.getId(), "Chiffres cohérents", gestionnaire);

        assertThat(resultat.statut()).isEqualTo(StatutCompteRendu.CONTROLE);
        assertThat(resultat.observationControle()).isEqualTo("Chiffres cohérents");
        assertThat(resultat.controlePar()).isEqualTo("gestionnaire");
        verify(serviceNotification).notifier(eq(agent.getId()), eq("COMPTE_RENDU_CONTROLE"), anyString(),
                anyString(), eq("compte_rendu"), any());
    }

    @Test
    void personne_ne_controle_son_propre_compte_rendu() {
        // Cas réel : un Chef des agents de terrain porte AGENT_TERRAIN et pourrait cumuler les habilitations.
        CompteRendu transmis = compteRenduExistant(TypeCompteRendu.TERRAIN, StatutCompteRendu.TRANSMIS,
                gestionnaire.getId());

        assertThatThrownBy(() -> service.controler(transmis.getId(), "Tout va bien", gestionnaire))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasMessageContaining("que vous avez produit");
    }

    @Test
    void refuse_de_controler_un_compte_rendu_resté_en_brouillon() {
        CompteRendu brouillon = compteRenduExistant(TypeCompteRendu.TERRAIN, StatutCompteRendu.BROUILLON,
                agent.getId());

        assertThatThrownBy(() -> service.controler(brouillon.getId(), null, gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("transmis");
    }

    @Test
    void consolider_additionne_les_indicateurs_et_trace_chaque_source() {
        CompteRendu a = compteRenduSimple(StatutCompteRendu.CONTROLE, 10, 8, 1, 4, "20000", "Pluie");
        CompteRendu b = compteRenduSimple(StatutCompteRendu.CONTROLE, 5, 5, 2, 3, "15000", "Route coupée");
        when(compteRenduRepository.findByIdInAndArchiveFalse(anyList())).thenReturn(List.of(a, b));

        CompteRenduDto consolide = service.consolider(
                new ConsolidationDto(List.of(a.getId(), b.getId()), "Semaine correcte", null, null), gestionnaire);

        assertThat(consolide.type()).isEqualTo(TypeCompteRendu.CONSOLIDE);
        assertThat(consolide.nbVisites()).isEqualTo(15);
        assertThat(consolide.nbAdherentsRencontres()).isEqualTo(13);
        assertThat(consolide.nbAdherentsCrees()).isEqualTo(3);
        assertThat(consolide.nbPaiementsEnregistres()).isEqualTo(7);
        assertThat(consolide.montantCollecte()).isEqualByComparingTo("35000");
        // Les difficultés du terrain sont conservées telles quelles, pas résumées à la place des agents.
        assertThat(consolide.difficultes()).contains("Pluie").contains("Route coupée");
        assertThat(consolide.sourceIds()).containsExactly(a.getId(), b.getId());

        verify(sourceRepository, org.mockito.Mockito.times(2)).save(any(CompteRenduSource.class));
        assertThat(a.getStatut()).isEqualTo(StatutCompteRendu.CONSOLIDE);
        assertThat(b.getStatut()).isEqualTo(StatutCompteRendu.CONSOLIDE);
    }

    @Test
    void la_periode_du_consolide_couvre_toutes_ses_sources() {
        CompteRendu ancien = compteRenduSimple(StatutCompteRendu.CONTROLE, 1, 1, 0, 0, "1000", null);
        CompteRendu recent = compteRenduSimple(StatutCompteRendu.CONTROLE, 1, 1, 0, 0, "1000", null);
        definirPeriode(ancien, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 7));
        definirPeriode(recent, LocalDate.of(2026, 9, 8), LocalDate.of(2026, 9, 14));
        when(compteRenduRepository.findByIdInAndArchiveFalse(anyList())).thenReturn(List.of(ancien, recent));

        CompteRenduDto consolide = service.consolider(
                new ConsolidationDto(List.of(ancien.getId(), recent.getId()), null, null, null), gestionnaire);

        assertThat(consolide.periodeDebut()).isEqualTo(LocalDate.of(2026, 9, 1));
        assertThat(consolide.periodeFin()).isEqualTo(LocalDate.of(2026, 9, 14));
    }

    @Test
    void refuse_de_consolider_un_compte_rendu_non_controle() {
        CompteRendu nonControle = compteRenduSimple(StatutCompteRendu.TRANSMIS, 1, 1, 0, 0, "1000", null);
        when(compteRenduRepository.findByIdInAndArchiveFalse(anyList())).thenReturn(List.of(nonControle));

        assertThatThrownBy(() -> service.consolider(
                new ConsolidationDto(List.of(nonControle.getId()), null, null, null), gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("contrôlé avant");

        verify(sourceRepository, never()).save(any());
    }

    @Test
    void un_consolide_est_transmis_a_la_dga_et_non_au_gestionnaire() {
        CompteRendu consolide = compteRenduExistant(TypeCompteRendu.CONSOLIDE, StatutCompteRendu.BROUILLON,
                gestionnaire.getId());
        when(serviceNotification.notifierRoles(anyList(), anyString(), anyString(), anyString(), anyString(), any()))
                .thenReturn(1);

        service.transmettre(consolide.getId(), gestionnaire);

        ArgumentCaptor<List<String>> roles = ArgumentCaptor.captor();
        verify(serviceNotification).notifierRoles(roles.capture(), anyString(), anyString(), anyString(),
                anyString(), any());
        assertThat(roles.getValue()).containsExactly("DGA");
    }

    // ------------------------------------------------------------------ Fixtures

    private static Utilisateur utilisateur(String identifiant, UUID id) {
        Utilisateur u = new Utilisateur(identifiant, "hash", identifiant);
        forcerId(u, id);
        return u;
    }

    private CompteRendu compteRenduExistant(TypeCompteRendu type, StatutCompteRendu statut, UUID auteurId) {
        CompteRendu compteRendu = new CompteRendu(type, auteurId, LocalDate.now().minusDays(7),
                LocalDate.now().minusDays(1));
        appliquerStatut(compteRendu, statut);
        UUID id = UUID.randomUUID();
        forcerId(compteRendu, id);
        when(compteRenduRepository.findById(id)).thenReturn(Optional.of(compteRendu));
        return compteRendu;
    }

    private CompteRendu compteRenduSimple(StatutCompteRendu statut, int visites, int rencontres, int crees,
                                           int paiements, String montant, String difficultes) {
        CompteRendu compteRendu = new CompteRendu(TypeCompteRendu.TERRAIN, agent.getId(),
                LocalDate.now().minusDays(7), LocalDate.now().minusDays(1));
        compteRendu.renseignerIndicateurs(visites, rencontres, crees, paiements, new BigDecimal(montant));
        compteRendu.setDifficultes(difficultes);
        appliquerStatut(compteRendu, statut);
        forcerId(compteRendu, UUID.randomUUID());
        return compteRendu;
    }

    /** Amène l'entité au statut voulu par ses propres transitions, sans réflexion sur le champ. */
    private static void appliquerStatut(CompteRendu compteRendu, StatutCompteRendu cible) {
        switch (cible) {
            case BROUILLON -> {
            }
            case TRANSMIS -> compteRendu.transmettre(null);
            case CONTROLE -> {
                compteRendu.transmettre(null);
                compteRendu.marquerControle(null, "gestionnaire");
            }
            case CONSOLIDE -> {
                compteRendu.transmettre(null);
                compteRendu.marquerControle(null, "gestionnaire");
                compteRendu.marquerConsolide();
            }
        }
    }

    private static void definirPeriode(CompteRendu compteRendu, LocalDate debut, LocalDate fin) {
        definirChamp(compteRendu, "periodeDebut", debut);
        definirChamp(compteRendu, "periodeFin", fin);
    }

    private static void definirChamp(Object cible, String nom, Object valeur) {
        try {
            var champ = cible.getClass().getDeclaredField(nom);
            champ.setAccessible(true);
            champ.set(cible, valeur);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    /** L'identifiant est porté par {@code EntiteAuditable} et généré par la base. */
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
