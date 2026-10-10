package cm.cositi.api.document.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.util.ChiffrementFichier;
import cm.cositi.api.document.dto.ContenuDocument;
import cm.cositi.api.document.dto.DocumentDto;
import cm.cositi.api.document.dto.RattachementDto;
import cm.cositi.api.document.entite.AnalyseAntivirus;
import cm.cositi.api.document.entite.Document;
import cm.cositi.api.document.entite.StatutDocument;
import cm.cositi.api.document.entite.TypeDocument;
import cm.cositi.api.document.repository.DocumentRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Téléversement et téléchargement de documents (jalon J7).
 *
 * <p>Ce qui est vérifié ici tient en une phrase : <b>aucun fichier non contrôlé n'atteint le disque, et
 * aucun contenu ne sort du serveur sans trace</b>. Les contrôles testés viennent de docs/04_SECURITE.md §5
 * (signature binaire, taille, antivirus, chiffrement au repos) et §4 (consultation journalisée).</p>
 */
@ExtendWith(MockitoExtension.class)
class ServiceStockageDocumentImplTest {

    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01, 0x02};

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private ServicePerimetreDonnees perimetre;
    @Mock
    private ServiceAnalyseAntivirus antivirus;
    @Mock
    private ServiceAudit serviceAudit;

    @TempDir
    Path repertoire;

    private ServiceStockageDocumentImpl service;
    private ChiffrementFichier chiffrement;
    private Utilisateur auteur;
    private UUID adherentId;

    @BeforeEach
    void setUp() {
        // Clé de test : 32 octets, comme l'exige AES-256.
        chiffrement = new ChiffrementFichier(java.util.Base64.getEncoder()
                .encodeToString("0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.US_ASCII)));
        service = new ServiceStockageDocumentImpl(documentRepository, perimetre, antivirus, chiffrement,
                serviceAudit, repertoire.toString(), 10 * 1024 * 1024);

        auteur = new Utilisateur("gestionnaire.test", "hash", "Gestionnaire Test");
        adherentId = UUID.randomUUID();
    }

    private MockMultipartFile fichierPng(String nom) {
        return new MockMultipartFile("fichier", nom, "image/png", PNG);
    }

    private void repondreSauvegarde() {
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void televerse_un_png_valide_le_chiffre_sur_disque_et_journalise() throws IOException {
        when(antivirus.analyser(any(), anyString())).thenReturn(AnalyseAntivirus.PROPRE);
        when(documentRepository.findFirstByEmpreinteSha256AndAdherentIdAndArchiveFalse(anyString(), eq(adherentId)))
                .thenReturn(Optional.empty());
        repondreSauvegarde();

        DocumentDto dto = service.televerser(fichierPng("cni.png"), TypeDocument.CNI,
                new RattachementDto(adherentId, null), auteur);

        assertThat(dto.typeMime()).isEqualTo("image/png");
        assertThat(dto.chiffre()).isTrue();

        // Un seul fichier écrit, et son contenu n'est pas le contenu d'origine.
        try (var fichiers = Files.list(repertoire)) {
            List<Path> ecrits = fichiers.toList();
            assertThat(ecrits).hasSize(1);
            byte[] surDisque = Files.readAllBytes(ecrits.get(0));
            assertThat(surDisque).isNotEqualTo(PNG);
            assertThat(chiffrement.dechiffrer(surDisque)).isEqualTo(PNG);
        }

        verify(serviceAudit).tracer(eq(TypeOperation.DOCUMENT_TELEVERSEMENT), eq("document"), any(), any(), any(),
                anyString());
    }

    @Test
    void refuse_un_fichier_dont_le_contenu_ne_correspond_a_aucun_format_autorise() {
        // Extension et Content-Type annoncent un PDF ; le contenu est un exécutable.
        MockMultipartFile piege = new MockMultipartFile("fichier", "contrat.pdf", "application/pdf",
                new byte[]{0x4D, 0x5A, (byte) 0x90, 0x00});

        assertThatThrownBy(() -> service.televerser(piege, TypeDocument.AUTRE,
                new RattachementDto(adherentId, null), auteur))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("aucun format autorisé");

        verify(documentRepository, never()).save(any());
        assertThat(repertoire.toFile().list()).isEmpty();
    }

    @Test
    void refuse_un_fichier_signale_par_l_antivirus_sans_rien_ecrire_sur_disque() {
        when(antivirus.analyser(any(), anyString())).thenReturn(AnalyseAntivirus.INFECTE);
        lenient().when(documentRepository.findFirstByEmpreinteSha256AndAdherentIdAndArchiveFalse(anyString(), any()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.televerser(fichierPng("photo.png"), TypeDocument.AUTRE,
                new RattachementDto(adherentId, null), auteur))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("antivirus");

        verify(documentRepository, never()).save(any());
        assertThat(repertoire.toFile().list()).isEmpty();
    }

    @Test
    void refuse_un_rattachement_ni_adherent_ni_paiement() {
        assertThatThrownBy(() -> service.televerser(fichierPng("x.png"), TypeDocument.AUTRE,
                new RattachementDto(null, null), auteur))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("exactement l'un des deux");
    }

    @Test
    void refuse_un_rattachement_a_la_fois_adherent_et_paiement() {
        assertThatThrownBy(() -> service.televerser(fichierPng("x.png"), TypeDocument.AUTRE,
                new RattachementDto(adherentId, UUID.randomUUID()), auteur))
                .isInstanceOf(ExceptionValidation.class);
    }

    @Test
    void refuse_le_televersement_hors_perimetre_de_donnees() {
        doThrow(new ExceptionAutorisation("PERIMETRE_ADHERENT_REFUSE", "Hors périmètre."))
                .when(perimetre).verifierAccesAdherent(auteur, adherentId);

        assertThatThrownBy(() -> service.televerser(fichierPng("x.png"), TypeDocument.CNI,
                new RattachementDto(adherentId, null), auteur))
                .isInstanceOf(ExceptionAutorisation.class);

        assertThat(repertoire.toFile().list()).isEmpty();
    }

    @Test
    void refuse_un_doublon_exact_sur_le_meme_adherent() {
        // Aucun stub d'antivirus ici : le doublon est détecté sur l'empreinte AVANT l'analyse, qui n'est donc
        // jamais appelée. Analyser un fichier qu'on s'apprête à refuser serait du travail perdu.
        Document existant = new Document(TypeDocument.CNI, "cni-deja-la.png", "abc.chiffre", "image/png",
                PNG.length, "empreinte", adherentId, null, "gestionnaire.test");
        when(documentRepository.findFirstByEmpreinteSha256AndAdherentIdAndArchiveFalse(anyString(), eq(adherentId)))
                .thenReturn(Optional.of(existant));

        assertThatThrownBy(() -> service.televerser(fichierPng("cni.png"), TypeDocument.CNI,
                new RattachementDto(adherentId, null), auteur))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("cni-deja-la.png");
    }

    @Test
    void telecharge_le_contenu_en_clair_et_journalise_la_consultation() {
        Document document = documentSurDisque(AnalyseAntivirus.PROPRE, StatutDocument.VERIFIE);

        ContenuDocument contenu = service.telecharger(document.getId(), auteur);

        assertThat(contenu.octets()).isEqualTo(PNG);
        assertThat(contenu.typeMime()).isEqualTo("image/png");
        verify(serviceAudit).tracer(eq(TypeOperation.DOCUMENT_CONSULTATION), eq("document"), eq(document.getId()),
                any(), any(), anyString());
    }

    @Test
    void refuse_le_telechargement_d_un_document_non_declare_sain() {
        Document document = documentSurDisque(AnalyseAntivirus.EN_ATTENTE, StatutDocument.AJOUTE);

        assertThatThrownBy(() -> service.telecharger(document.getId(), auteur))
                .isInstanceOf(ExceptionAutorisation.class)
                .hasMessageContaining("antivirus");

        verify(serviceAudit, never()).tracer(eq(TypeOperation.DOCUMENT_CONSULTATION), anyString(), any(), any(),
                any(), anyString());
    }

    @Test
    void refuse_une_transition_de_statut_impossible() {
        Document document = documentSurDisque(AnalyseAntivirus.PROPRE, StatutDocument.AJOUTE);
        document.archiver("Doublon");

        assertThatThrownBy(() -> service.changerStatut(document.getId(), StatutDocument.VERIFIE, "Retour", auteur))
                .isInstanceOf(ExceptionConflit.class)
                .hasMessageContaining("interdite");
    }

    @Test
    void exige_un_motif_pour_rejeter_un_document() {
        Document document = documentSurDisque(AnalyseAntivirus.PROPRE, StatutDocument.AJOUTE);

        assertThatThrownBy(() -> service.changerStatut(document.getId(), StatutDocument.REJETE, "  ", auteur))
                .isInstanceOf(ExceptionValidation.class)
                .hasMessageContaining("motif");
    }

    /** Crée un document réellement présent (chiffré) dans le répertoire temporaire, et le rend trouvable. */
    private Document documentSurDisque(AnalyseAntivirus analyse, StatutDocument statut) {
        String nomStockage = UUID.randomUUID() + ".chiffre";
        try {
            Files.write(repertoire.resolve(nomStockage), chiffrement.chiffrer(PNG));
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
        Document document = new Document(TypeDocument.CNI, "cni.png", nomStockage, "image/png", PNG.length,
                "empreinte", adherentId, null, "gestionnaire.test");
        document.setAnalyseAntivirus(analyse);
        document.setStatut(statut);
        forcerId(document, UUID.randomUUID());
        when(documentRepository.findById(document.getId())).thenReturn(Optional.of(document));
        lenient().when(documentRepository.save(any(Document.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        return document;
    }

    /** L'identifiant est généré par la base ; en test unitaire on le pose par réflexion, comme en J6. */
    private static void forcerId(Document document, UUID id) {
        try {
            var champ = Document.class.getDeclaredField("id");
            champ.setAccessible(true);
            champ.set(document, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
