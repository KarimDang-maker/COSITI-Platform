package cm.cositi.api.cnps.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.cnps.dto.AjoutPiecePrestationDto;
import cm.cositi.api.cnps.dto.ChangementStatutDossierPrestationDto;
import cm.cositi.api.cnps.dto.CreationDossierPrestationDto;
import cm.cositi.api.cnps.dto.DossierPrestationCnpsDto;
import cm.cositi.api.cnps.dto.HistoriqueDossierPrestationCnpsDto;
import cm.cositi.api.cnps.dto.PieceManquantePrestationDto;
import cm.cositi.api.cnps.entite.DossierPrestationCnps;
import cm.cositi.api.cnps.entite.HistoriqueDossierPrestationCnps;
import cm.cositi.api.cnps.entite.OffreCnps;
import cm.cositi.api.cnps.entite.PieceDossierPrestationCnps;
import cm.cositi.api.cnps.entite.PieceOffreCnps;
import cm.cositi.api.cnps.entite.StatutDossierPrestationCnps;
import cm.cositi.api.cnps.entite.StatutPieceCnps;
import cm.cositi.api.cnps.repository.DossierPrestationCnpsRepository;
import cm.cositi.api.cnps.repository.HistoriqueDossierPrestationCnpsRepository;
import cm.cositi.api.cnps.repository.OffreCnpsRepository;
import cm.cositi.api.cnps.repository.PieceDossierPrestationCnpsRepository;
import cm.cositi.api.cnps.repository.PieceOffreCnpsRepository;
import cm.cositi.api.commun.entite.EntiteAuditable;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionValidation;
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

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Dossiers de prestation CNPS (module Gestionnaire des comptes, V16) : le référentiel de pièces exigées vient
 * toujours de l'offre ({@code piece_offre_cnps}), jamais d'une constante Java, et un dossier ne peut pas passer
 * COMPLET tant qu'il manque une pièce obligatoire — même principe que {@link ServiceDossierCnpsImplTest} pour
 * l'immatriculation.
 */
@ExtendWith(MockitoExtension.class)
class ServiceDossierPrestationCnpsImplTest {

    @Mock
    private OffreCnpsRepository offreRepository;
    @Mock
    private PieceOffreCnpsRepository pieceOffreRepository;
    @Mock
    private DossierPrestationCnpsRepository dossierRepository;
    @Mock
    private PieceDossierPrestationCnpsRepository pieceDossierRepository;
    @Mock
    private HistoriqueDossierPrestationCnpsRepository historiqueRepository;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private ServiceDossierPrestationCnpsImpl service;

    private Utilisateur gestionnaire;
    private UUID adherentId;
    private UUID offreId;
    private UUID dossierId;

    @BeforeEach
    void setUp() {
        service = new ServiceDossierPrestationCnpsImpl(offreRepository, pieceOffreRepository, dossierRepository,
                pieceDossierRepository, historiqueRepository, perimetre, serviceAudit, jdbcTemplate);
        gestionnaire = new Utilisateur("gestionnaire.test", "hash", "Gestionnaire Test");
        adherentId = UUID.randomUUID();
        offreId = UUID.randomUUID();
        dossierId = UUID.randomUUID();

        lenient().when(offreRepository.findById(offreId))
                .thenReturn(Optional.of(creerOffre(offreId, "PF", "PF_ALLOCATIONS_FAMILIALES", "Allocations familiales")));
        lenient().when(pieceOffreRepository.findByOffreIdOrderByOrdreAffichageAsc(offreId)).thenReturn(List.of());
        lenient().when(pieceDossierRepository.findByDossierId(any())).thenReturn(List.of());
        lenient().when(dossierRepository.save(any(DossierPrestationCnps.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(pieceDossierRepository.save(any(PieceDossierPrestationCnps.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        // Identité adhérent (matricule/nom/n° CNPS) affichée sur le DTO — sans rapport avec le métier testé
        // ici, une ligne vide suffit pour chaque test qui construit un DTO complet.
        lenient().when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(UUID.class)))
                .thenReturn(List.of());
    }

    @Test
    void ouvre_un_dossier_et_cree_les_pieces_lues_dans_le_referentiel_de_l_offre() {
        UUID pieceCniId = UUID.randomUUID();
        UUID pieceActeId = UUID.randomUUID();
        when(pieceOffreRepository.findByOffreIdOrderByOrdreAffichageAsc(offreId)).thenReturn(List.of(
                creerPieceOffre(pieceCniId, offreId, "CNI recto", true),
                creerPieceOffre(pieceActeId, offreId, "Acte de naissance", true)));

        CreationDossierPrestationDto dto = new CreationDossierPrestationDto(adherentId, offreId, 2);
        DossierPrestationCnpsDto resultat = service.ouvrir(dto, gestionnaire);

        assertThat(resultat.statut()).isEqualTo(StatutDossierPrestationCnps.INCOMPLET);

        ArgumentCaptor<PieceDossierPrestationCnps> pieces = ArgumentCaptor.forClass(PieceDossierPrestationCnps.class);
        verify(pieceDossierRepository, times(2)).save(pieces.capture());
        assertThat(pieces.getAllValues())
                .extracting(PieceDossierPrestationCnps::getPieceOffreId)
                .containsExactly(pieceCniId, pieceActeId);

        verify(historiqueRepository).save(any(HistoriqueDossierPrestationCnps.class));
        verify(serviceAudit).tracer(eq(TypeOperation.CNPS_DOSSIER_CREATION), eq("dossier_prestation_cnps"), any(),
                any(), any(), anyString());
        verify(perimetre).verifierAccesAdherent(gestionnaire, adherentId);
    }

    @Test
    void refuse_l_ouverture_sur_une_offre_introuvable_ou_inactive() {
        UUID offreInconnue = UUID.randomUUID();
        when(offreRepository.findById(offreInconnue)).thenReturn(Optional.empty());

        CreationDossierPrestationDto dto = new CreationDossierPrestationDto(adherentId, offreInconnue, null);

        assertThatThrownBy(() -> service.ouvrir(dto, gestionnaire))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("introuvable");

        verify(dossierRepository, never()).save(any());
    }

    @Test
    void refuse_le_passage_a_complet_tant_qu_une_piece_obligatoire_manque() {
        dossierExistant(StatutDossierPrestationCnps.INCOMPLET);
        when(pieceOffreRepository.findByOffreIdOrderByOrdreAffichageAsc(offreId))
                .thenReturn(List.of(creerPieceOffre(UUID.randomUUID(), offreId, "CNI recto", true)));

        ChangementStatutDossierPrestationDto dto =
                new ChangementStatutDossierPrestationDto(StatutDossierPrestationCnps.COMPLET, null);

        assertThatThrownBy(() -> service.changerStatut(dossierId, dto, gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("manquent");
    }

    @Test
    void autorise_le_passage_a_complet_quand_toutes_les_pieces_obligatoires_sont_fournies() {
        dossierExistant(StatutDossierPrestationCnps.INCOMPLET);
        UUID pieceCniId = UUID.randomUUID();
        when(pieceOffreRepository.findByOffreIdOrderByOrdreAffichageAsc(offreId))
                .thenReturn(List.of(creerPieceOffre(pieceCniId, offreId, "CNI recto", true)));
        PieceDossierPrestationCnps fournie = new PieceDossierPrestationCnps(dossierId, pieceCniId, "gestionnaire.test");
        fournie.rattacher(UUID.randomUUID());
        when(pieceDossierRepository.findByDossierId(dossierId)).thenReturn(List.of(fournie));

        ChangementStatutDossierPrestationDto dto =
                new ChangementStatutDossierPrestationDto(StatutDossierPrestationCnps.COMPLET, "Dossier complet");
        DossierPrestationCnpsDto resultat = service.changerStatut(dossierId, dto, gestionnaire);

        assertThat(resultat.statut()).isEqualTo(StatutDossierPrestationCnps.COMPLET);
        verify(historiqueRepository).save(any(HistoriqueDossierPrestationCnps.class));
        verify(serviceAudit).tracer(eq(TypeOperation.CNPS_CHANGEMENT_STATUT), eq("dossier_prestation_cnps"),
                eq(dossierId), eq(StatutDossierPrestationCnps.INCOMPLET), eq(StatutDossierPrestationCnps.COMPLET),
                eq("Dossier complet"));
    }

    @Test
    void refuse_une_transition_hors_du_graphe_autorise() {
        dossierExistant(StatutDossierPrestationCnps.INCOMPLET);

        // INCOMPLET n'ouvre que sur COMPLET : on ne transmet pas un dossier jamais préparé.
        ChangementStatutDossierPrestationDto dto =
                new ChangementStatutDossierPrestationDto(StatutDossierPrestationCnps.TRANSMIS_CNPS, null);

        assertThatThrownBy(() -> service.changerStatut(dossierId, dto, gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("interdite");
    }

    @Test
    void exige_un_motif_pour_rejeter_un_dossier() {
        dossierExistant(StatutDossierPrestationCnps.TRANSMIS_CNPS);

        ChangementStatutDossierPrestationDto dto =
                new ChangementStatutDossierPrestationDto(StatutDossierPrestationCnps.REJETE, "   ");

        assertThatThrownBy(() -> service.changerStatut(dossierId, dto, gestionnaire))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("motif");
    }

    @Test
    void refuse_d_ajouter_une_piece_a_un_dossier_deja_transmis_a_la_cnps() {
        dossierExistant(StatutDossierPrestationCnps.TRANSMIS_CNPS);

        AjoutPiecePrestationDto dto = new AjoutPiecePrestationDto(UUID.randomUUID(), UUID.randomUUID());

        assertThatThrownBy(() -> service.ajouterPiece(dossierId, dto, gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("TRANSMIS_CNPS");

        verify(pieceDossierRepository, never()).save(any());
    }

    @Test
    void refuse_d_ajouter_une_piece_hors_du_referentiel_de_l_offre() {
        dossierExistant(StatutDossierPrestationCnps.INCOMPLET);
        when(pieceOffreRepository.findByOffreIdOrderByOrdreAffichageAsc(offreId))
                .thenReturn(List.of(creerPieceOffre(UUID.randomUUID(), offreId, "CNI recto", true)));

        AjoutPiecePrestationDto dto = new AjoutPiecePrestationDto(UUID.randomUUID(), UUID.randomUUID());

        assertThatThrownBy(() -> service.ajouterPiece(dossierId, dto, gestionnaire))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("référentiel");
    }

    @Test
    void liste_les_pieces_manquantes_en_distinguant_attendue_et_rejetee() {
        dossierExistant(StatutDossierPrestationCnps.INCOMPLET);
        UUID pieceRejeteeId = UUID.randomUUID();
        UUID pieceJamaisFournieId = UUID.randomUUID();
        when(pieceOffreRepository.findByOffreIdOrderByOrdreAffichageAsc(offreId)).thenReturn(List.of(
                creerPieceOffre(pieceRejeteeId, offreId, "CNI recto", true),
                creerPieceOffre(pieceJamaisFournieId, offreId, "Certificat de scolarité", true)));

        PieceDossierPrestationCnps rejetee = new PieceDossierPrestationCnps(dossierId, pieceRejeteeId, "gestionnaire.test");
        poserChamp(rejetee, "statut", StatutPieceCnps.REJETEE);
        when(pieceDossierRepository.findByDossierId(dossierId)).thenReturn(List.of(rejetee));

        List<PieceManquantePrestationDto> manquantes = service.piecesManquantes(dossierId, gestionnaire);

        assertThat(manquantes).containsExactly(
                new PieceManquantePrestationDto(pieceRejeteeId, "CNI recto", StatutPieceCnps.REJETEE),
                new PieceManquantePrestationDto(pieceJamaisFournieId, "Certificat de scolarité", StatutPieceCnps.ATTENDUE));
    }

    @Test
    void retourne_le_journal_du_dossier_scope_sans_passer_par_l_audit_global() {
        dossierExistant(StatutDossierPrestationCnps.INCOMPLET);
        HistoriqueDossierPrestationCnps ligne = new HistoriqueDossierPrestationCnps(dossierId, null,
                StatutDossierPrestationCnps.INCOMPLET, gestionnaire.getId(), "Ouverture du dossier");
        when(historiqueRepository.findByDossierIdOrderByHorodatageDesc(dossierId)).thenReturn(List.of(ligne));

        List<HistoriqueDossierPrestationCnpsDto> journal = service.journal(dossierId, gestionnaire);

        assertThat(journal).hasSize(1);
        assertThat(journal.get(0).statutApres()).isEqualTo(StatutDossierPrestationCnps.INCOMPLET);
        verify(perimetre).verifierAccesAdherent(gestionnaire, adherentId);
    }

    private DossierPrestationCnps dossierExistant(StatutDossierPrestationCnps statut) {
        DossierPrestationCnps dossier = new DossierPrestationCnps(adherentId, offreId);
        dossier.setStatut(statut);
        forcerId(dossier, dossierId);
        when(dossierRepository.findById(dossierId)).thenReturn(Optional.of(dossier));
        return dossier;
    }

    private static OffreCnps creerOffre(UUID id, String rubrique, String code, String libelle) {
        OffreCnps offre = instancier(OffreCnps.class);
        poserChamp(offre, "id", id);
        poserChamp(offre, "rubrique", rubrique);
        poserChamp(offre, "code", code);
        poserChamp(offre, "libelle", libelle);
        poserChamp(offre, "actif", true);
        return offre;
    }

    private static PieceOffreCnps creerPieceOffre(UUID id, UUID offreId, String libelle, boolean obligatoire) {
        PieceOffreCnps piece = instancier(PieceOffreCnps.class);
        poserChamp(piece, "id", id);
        poserChamp(piece, "offreId", offreId);
        poserChamp(piece, "libelle", libelle);
        poserChamp(piece, "obligatoire", obligatoire);
        return piece;
    }

    private static <T> T instancier(Class<T> classe) {
        try {
            var constructeur = classe.getDeclaredConstructor();
            constructeur.setAccessible(true);
            return constructeur.newInstance();
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void poserChamp(Object cible, String nom, Object valeur) {
        try {
            var champ = cible.getClass().getDeclaredField(nom);
            champ.setAccessible(true);
            champ.set(cible, valeur);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    /** L'identifiant est porté par {@code EntiteAuditable} et généré par la base : posé ici par réflexion. */
    private static void forcerId(DossierPrestationCnps dossier, UUID id) {
        try {
            var champ = EntiteAuditable.class.getDeclaredField("id");
            champ.setAccessible(true);
            champ.set(dossier, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
