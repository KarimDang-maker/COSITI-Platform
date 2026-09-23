package cm.cositi.api.document.entite;

import cm.cositi.api.commun.validation.DonneeSensible;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Document justificatif stocké hors racine web et servi uniquement par l'API après contrôle d'accès
 * (docs/02_CLASSES_ET_METHODES.md §7, docs/04_SECURITE.md §4/§5).
 *
 * <p>Table {@code document} (V4__cnps_documents_relances.sql, schéma non modifié) : elle porte
 * {@code cree_le}/{@code cree_par} mais <b>ni {@code modifie_le} ni {@code modifie_par}</b> — cette entité
 * n'étend donc pas {@code EntiteAuditable}, dont le contrat exige les quatre colonnes. La traçabilité des
 * changements d'état passe par le journal d'audit ({@code DOCUMENT_TELEVERSEMENT},
 * {@code DOCUMENT_CONSULTATION}, {@code DOCUMENT_SUPPRESSION_LOGIQUE}).</p>
 *
 * <p>{@code cheminStockage} est le nom de fichier régénéré (UUID), jamais le nom fourni par le client :
 * {@code nomFichierOriginal} n'est conservé que pour l'affichage, assaini à l'entrée.</p>
 */
@Entity
@Table(name = "document")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_document", nullable = false, length = 40)
    private TypeDocument typeDocument;

    @Column(name = "nom_fichier_original", nullable = false, length = 255)
    private String nomFichierOriginal;

    @Column(name = "chemin_stockage", nullable = false, unique = true, length = 500)
    private String cheminStockage;

    @Column(name = "type_mime", nullable = false, length = 100)
    private String typeMime;

    @Column(name = "taille_octets", nullable = false)
    private long tailleOctets;

    /**
     * Empreinte du contenu <b>en clair</b>, calculée avant chiffrement : sert à la détection de doublon.
     *
     * <p>{@code @JdbcTypeCode(SqlTypes.CHAR)} est nécessaire parce que V4 déclare {@code CHAR(64)} et non
     * {@code VARCHAR(64)} : par défaut Hibernate mappe un {@code String} sur {@code VARCHAR} et
     * {@code ddl-auto=validate} refuse alors de démarrer. {@code columnDefinition} ne suffit pas — il décrit
     * la génération de schéma, pas le type JDBC attendu à la validation. Une empreinte SHA-256 en
     * hexadécimal fait exactement 64 caractères, le remplissage propre au type CHAR ne joue donc jamais.</p>
     */
    @DonneeSensible
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "empreinte_sha256", nullable = false, length = 64)
    private String empreinteSha256;

    @Column(name = "chiffre", nullable = false)
    private boolean chiffre = true;

    @Column(name = "adherent_id")
    private UUID adherentId;

    @Column(name = "paiement_id")
    private UUID paiementId;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutDocument statut = StatutDocument.AJOUTE;

    @Enumerated(EnumType.STRING)
    @Column(name = "analyse_antivirus", nullable = false, length = 20)
    private AnalyseAntivirus analyseAntivirus = AnalyseAntivirus.EN_ATTENTE;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    @Column(name = "cree_par", updatable = false, length = 80)
    private String creePar;

    @Column(name = "archive", nullable = false)
    private boolean archive = false;

    @Column(name = "motif_archivage", columnDefinition = "TEXT")
    private String motifArchivage;

    protected Document() {
    }

    public Document(TypeDocument typeDocument, String nomFichierOriginal, String cheminStockage, String typeMime,
                     long tailleOctets, String empreinteSha256, UUID adherentId, UUID paiementId, String creePar) {
        this.typeDocument = typeDocument;
        this.nomFichierOriginal = nomFichierOriginal;
        this.cheminStockage = cheminStockage;
        this.typeMime = typeMime;
        this.tailleOctets = tailleOctets;
        this.empreinteSha256 = empreinteSha256;
        this.adherentId = adherentId;
        this.paiementId = paiementId;
        this.creePar = creePar;
        // `creeLe` est renseigné ici plutôt que laissé au DEFAULT now() de PostgreSQL : Hibernate envoie
        // explicitement NULL pour une colonne non renseignée, ce qui écrase le DEFAULT (même bug que
        // `Adhesion`/`AyantDroit.creeLe` corrigé au jalon J2).
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public TypeDocument getTypeDocument() {
        return typeDocument;
    }

    public String getNomFichierOriginal() {
        return nomFichierOriginal;
    }

    public String getCheminStockage() {
        return cheminStockage;
    }

    public String getTypeMime() {
        return typeMime;
    }

    public long getTailleOctets() {
        return tailleOctets;
    }

    public String getEmpreinteSha256() {
        return empreinteSha256;
    }

    public boolean isChiffre() {
        return chiffre;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public UUID getPaiementId() {
        return paiementId;
    }

    public StatutDocument getStatut() {
        return statut;
    }

    public void setStatut(StatutDocument statut) {
        this.statut = statut;
    }

    public AnalyseAntivirus getAnalyseAntivirus() {
        return analyseAntivirus;
    }

    public void setAnalyseAntivirus(AnalyseAntivirus analyseAntivirus) {
        this.analyseAntivirus = analyseAntivirus;
    }

    public Instant getCreeLe() {
        return creeLe;
    }

    public String getCreePar() {
        return creePar;
    }

    public boolean isArchive() {
        return archive;
    }

    public String getMotifArchivage() {
        return motifArchivage;
    }

    public void archiver(String motif) {
        this.archive = true;
        this.motifArchivage = motif;
        this.statut = StatutDocument.ARCHIVE;
    }

    /** Un document n'est téléchargeable que sain, non archivé et non rejeté. */
    public boolean estTelechargeable() {
        return !archive && analyseAntivirus == AnalyseAntivirus.PROPRE && statut != StatutDocument.REJETE;
    }
}
