package cm.cositi.api.cnps.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.cnps.dto.DossierCnpsDto;
import cm.cositi.api.cnps.dto.PieceManquanteDto;
import cm.cositi.api.cnps.entite.DossierCnps;
import cm.cositi.api.cnps.entite.HistoriqueDossierCnps;
import cm.cositi.api.cnps.entite.PieceDossierCnps;
import cm.cositi.api.cnps.entite.StatutDossierCnps;
import cm.cositi.api.cnps.entite.StatutPieceCnps;
import cm.cositi.api.cnps.entite.TypePieceCnps;
import cm.cositi.api.cnps.repository.DossierCnpsRepository;
import cm.cositi.api.cnps.repository.HistoriqueDossierCnpsRepository;
import cm.cositi.api.cnps.repository.PieceDossierCnpsRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Dossiers CNPS (jalon J7).
 *
 * <p>Deux points structurants sous test : la liste des pièces exigées vient toujours du paramètre
 * {@code PIECES_CNPS_OBLIGATOIRES} (jamais d'une constante Java — AGENTS.md règle n°1), et un dossier ne peut
 * pas être déclaré prêt tant qu'il manque une pièce obligatoire.</p>
 */
@ExtendWith(MockitoExtension.class)
class ServiceDossierCnpsImplTest {

    @Mock
    private DossierCnpsRepository dossierRepository;
    @Mock
    private PieceDossierCnpsRepository pieceRepository;
    @Mock
    private HistoriqueDossierCnpsRepository historiqueRepository;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ServiceParametre serviceParametre;
    @Mock
    private ServiceAudit serviceAudit;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private ServiceDossierCnpsImpl service;

    private Utilisateur gestionnaire;
    private UUID adherentId;
    private UUID dossierId;

    @BeforeEach
    void setUp() {
        service = new ServiceDossierCnpsImpl(dossierRepository, pieceRepository, historiqueRepository, perimetre,
                serviceParametre, serviceAudit, jdbcTemplate);
        gestionnaire = new Utilisateur("gestionnaire.test", "hash", "Gestionnaire Test");
        adherentId = UUID.randomUUID();
        dossierId = UUID.randomUUID();

        lenient().when(serviceParametre.texte(ServiceDossierCnpsImpl.CLE_PIECES_OBLIGATOIRES))
                .thenReturn("CNI_RECTO,CNI_VERSO,ACTE_NAISSANCE");
        lenient().when(serviceParametre.estValide(ServiceDossierCnpsImpl.CLE_PIECES_OBLIGATOIRES)).thenReturn(false);
        lenient().when(dossierRepository.save(any(DossierCnps.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(pieceRepository.save(any(PieceDossierCnps.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void ouvre_un_dossier_et_cree_les_pieces_attendues_lues_dans_le_parametre() {
        when(dossierRepository.existsByAdherentId(adherentId)).thenReturn(false);
        when(pieceRepository.findByDossierIdOrderByTypePiece(any())).thenReturn(List.of());

        DossierCnpsDto dto = service.ouvrir(adherentId, gestionnaire);

        assertThat(dto.statut()).isEqualTo(StatutDossierCnps.BROUILLON);

        ArgumentCaptor<PieceDossierCnps> pieces = ArgumentCaptor.forClass(PieceDossierCnps.class);
        verify(pieceRepository, org.mockito.Mockito.times(3)).save(pieces.capture());
        assertThat(pieces.getAllValues())
                .extracting(PieceDossierCnps::getTypePiece)
                .containsExactly(TypePieceCnps.CNI_RECTO, TypePieceCnps.CNI_VERSO, TypePieceCnps.ACTE_NAISSANCE);
        assertThat(pieces.getAllValues()).allMatch(PieceDossierCnps::isObligatoire);

        verify(historiqueRepository).save(any(HistoriqueDossierCnps.class));
        verify(serviceAudit).tracer(eq(TypeOperation.CNPS_DOSSIER_CREATION), eq("dossier_cnps"), any(), any(), any(),
                anyString());
    }

    @Test
    void refuse_un_second_dossier_pour_le_meme_adherent() {
        when(dossierRepository.existsByAdherentId(adherentId)).thenReturn(true);

        assertThatThrownBy(() -> service.ouvrir(adherentId, gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("existe déjà");

        verify(dossierRepository, never()).save(any());
    }

    @Test
    void ignore_un_type_de_piece_inconnu_du_parametre_sans_faire_echouer_l_ouverture() {
        when(serviceParametre.texte(ServiceDossierCnpsImpl.CLE_PIECES_OBLIGATOIRES))
                .thenReturn("CNI_RECTO,PIECE_QUI_NEXISTE_PAS,ACTE_NAISSANCE");
        when(dossierRepository.existsByAdherentId(adherentId)).thenReturn(false);
        when(pieceRepository.findByDossierIdOrderByTypePiece(any())).thenReturn(List.of());

        service.ouvrir(adherentId, gestionnaire);

        ArgumentCaptor<PieceDossierCnps> pieces = ArgumentCaptor.forClass(PieceDossierCnps.class);
        verify(pieceRepository, org.mockito.Mockito.times(2)).save(pieces.capture());
        assertThat(pieces.getAllValues())
                .extracting(PieceDossierCnps::getTypePiece)
                .containsExactly(TypePieceCnps.CNI_RECTO, TypePieceCnps.ACTE_NAISSANCE);
    }

    @Test
    void liste_les_pieces_manquantes_en_distinguant_jamais_fournie_et_rejetee() {
        DossierCnps dossier = dossierExistant(StatutDossierCnps.BROUILLON);
        PieceDossierCnps fournie = new PieceDossierCnps(dossierId, TypePieceCnps.CNI_RECTO, true, "gestionnaire.test");
        fournie.rattacher(UUID.randomUUID());
        PieceDossierCnps rejetee = new PieceDossierCnps(dossierId, TypePieceCnps.CNI_VERSO, true, "gestionnaire.test");
        rejetee.setStatut(StatutPieceCnps.REJETEE);
        // ACTE_NAISSANCE : aucune ligne du tout.
        when(pieceRepository.findByDossierIdOrderByTypePiece(dossierId)).thenReturn(List.of(fournie, rejetee));

        List<PieceManquanteDto> manquantes = service.piecesManquantes(dossier.getId(), gestionnaire);

        assertThat(manquantes).containsExactly(
                new PieceManquanteDto(TypePieceCnps.CNI_VERSO, StatutPieceCnps.REJETEE),
                new PieceManquanteDto(TypePieceCnps.ACTE_NAISSANCE, StatutPieceCnps.ATTENDUE));
    }

    @Test
    void refuse_le_passage_a_pret_tant_qu_une_piece_obligatoire_manque() {
        dossierExistant(StatutDossierCnps.BROUILLON);
        when(pieceRepository.findByDossierIdOrderByTypePiece(dossierId)).thenReturn(List.of());

        assertThatThrownBy(() -> service.changerStatut(dossierId, StatutDossierCnps.PRET, null, gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("pièces obligatoires manquent");
    }

    @Test
    void autorise_le_passage_a_pret_quand_toutes_les_pieces_obligatoires_sont_fournies() {
        dossierExistant(StatutDossierCnps.BROUILLON);
        when(pieceRepository.findByDossierIdOrderByTypePiece(dossierId)).thenReturn(toutesPiecesFournies());

        DossierCnpsDto dto = service.changerStatut(dossierId, StatutDossierCnps.PRET, "Dossier complet", gestionnaire);

        assertThat(dto.statut()).isEqualTo(StatutDossierCnps.PRET);
        verify(historiqueRepository).save(any(HistoriqueDossierCnps.class));
        verify(serviceAudit).tracer(eq(TypeOperation.CNPS_CHANGEMENT_STATUT), eq("dossier_cnps"), eq(dossierId),
                eq(StatutDossierCnps.BROUILLON), eq(StatutDossierCnps.PRET), anyString());
    }

    @Test
    void refuse_une_transition_hors_du_graphe_autorise() {
        dossierExistant(StatutDossierCnps.BROUILLON);

        // BROUILLON n'ouvre que sur INCOMPLET et PRET : on ne transmet pas un dossier jamais préparé.
        assertThatThrownBy(() -> service.changerStatut(dossierId, StatutDossierCnps.TRANSMIS, null, gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("interdite");
    }

    @Test
    void exige_un_motif_pour_rejeter_un_dossier() {
        dossierExistant(StatutDossierCnps.TRANSMIS);

        assertThatThrownBy(() -> service.changerStatut(dossierId, StatutDossierCnps.REJETE, "   ", gestionnaire))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("motif");
    }

    @Test
    void refuse_d_ajouter_une_piece_a_un_dossier_deja_transmis() {
        dossierExistant(StatutDossierCnps.TRANSMIS);

        assertThatThrownBy(() -> service.ajouterPiece(dossierId, UUID.randomUUID(), TypePieceCnps.CNI_RECTO,
                gestionnaire))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("TRANSMIS");

        verify(pieceRepository, never()).save(any());
    }

    @Test
    void remonte_un_avertissement_tant_que_la_composition_du_dossier_n_est_pas_validee() {
        DossierCnps dossier = dossierExistant(StatutDossierCnps.BROUILLON);
        when(pieceRepository.findByDossierIdOrderByTypePiece(dossierId)).thenReturn(toutesPiecesFournies());

        DossierCnpsDto dto = service.consulter(dossier.getId(), gestionnaire);

        assertThat(dto.avertissements())
                .anyMatch(a -> a.contains("PIECES_CNPS_OBLIGATOIRES"))
                .anyMatch(a -> a.contains("ASSIETTE_CNPS"));
    }

    private List<PieceDossierCnps> toutesPiecesFournies() {
        return List.of(TypePieceCnps.CNI_RECTO, TypePieceCnps.CNI_VERSO, TypePieceCnps.ACTE_NAISSANCE).stream()
                .map(type -> {
                    PieceDossierCnps piece = new PieceDossierCnps(dossierId, type, true, "gestionnaire.test");
                    piece.rattacher(UUID.randomUUID());
                    return piece;
                })
                .toList();
    }

    private DossierCnps dossierExistant(StatutDossierCnps statut) {
        DossierCnps dossier = new DossierCnps(adherentId);
        dossier.setStatut(statut);
        forcerId(dossier, dossierId);
        when(dossierRepository.findById(dossierId)).thenReturn(Optional.of(dossier));
        return dossier;
    }

    /** L'identifiant est porté par {@code EntiteAuditable} et généré par la base : posé ici par réflexion. */
    private static void forcerId(DossierCnps dossier, UUID id) {
        try {
            var champ = cm.cositi.api.commun.entite.EntiteAuditable.class.getDeclaredField("id");
            champ.setAccessible(true);
            champ.set(dossier, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
