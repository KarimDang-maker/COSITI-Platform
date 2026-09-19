package cm.cositi.api.document;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "document")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "type_document", nullable = false, length = 40)
    private String typeDocument; // CNI, ACTE_NAISSANCE, PREUVE_PAIEMENT, ACCUSE_CNPS, AUTRE

    @Column(name = "nom_fichier_original", nullable = false)
    private String nomFichierOriginal;

    @Column(name = "chemin_stockage", unique = true, nullable = false, length = 500)
    private String cheminStockage;

    @Column(name = "type_mime", nullable = false, length = 100)
    private String typeMime;

    @Column(name = "taille_octets", nullable = false)
    private long tailleOctets;

    @Column(name = "empreinte_sha256", nullable = false, length = 64)
    private String empreinteSha256;

    @Column(name = "chiffre", nullable = false)
    private boolean chiffre = true;

    @Column(name = "adherent_id")
    private UUID adherentId;

    @Column(name = "paiement_id")
    private UUID paiementId;

    @Column(name = "statut", nullable = false, length = 20)
    private String statut = "AJOUTE"; // AJOUTE, VERIFIE, REJETE, ARCHIVE

    @Column(name = "analyse_antivirus", nullable = false, length = 20)
    private String analyseAntivirus = "EN_ATTENTE"; // EN_ATTENTE, PROPRE, INFECTE

    @Column(name = "cree_le", nullable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "cree_par", length = 80)
    private String creePar;

    @Column(name = "archive", nullable = false)
    private boolean archive = false;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTypeDocument() { return typeDocument; }
    public void setTypeDocument(String typeDocument) { this.typeDocument = typeDocument; }
    public String getNomFichierOriginal() { return nomFichierOriginal; }
    public void setNomFichierOriginal(String nomFichierOriginal) { this.nomFichierOriginal = nomFichierOriginal; }
    public String getCheminStockage() { return cheminStockage; }
    public void setCheminStockage(String cheminStockage) { this.cheminStockage = cheminStockage; }
    public String getTypeMime() { return typeMime; }
    public void setTypeMime(String typeMime) { this.typeMime = typeMime; }
    public long getTailleOctets() { return tailleOctets; }
    public void setTailleOctets(long tailleOctets) { this.tailleOctets = tailleOctets; }
    public String getEmpreinteSha256() { return empreinteSha256; }
    public void setEmpreinteSha256(String empreinteSha256) { this.empreinteSha256 = empreinteSha256; }
    public boolean isChiffre() { return chiffre; }
    public void setChiffre(boolean chiffre) { this.chiffre = chiffre; }
    public UUID getAdherentId() { return adherentId; }
    public void setAdherentId(UUID adherentId) { this.adherentId = adherentId; }
    public UUID getPaiementId() { return paiementId; }
    public void setPaiementId(UUID paiementId) { this.paiementId = paiementId; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    public String getAnalyseAntivirus() { return analyseAntivirus; }
    public void setAnalyseAntivirus(String analyseAntivirus) { this.analyseAntivirus = analyseAntivirus; }
    public Instant getCreeLe() { return creeLe; }
    public void setCreeLe(Instant creeLe) { this.creeLe = creeLe; }
    public String getCreePar() { return creePar; }
    public void setCreePar(String creePar) { this.creePar = creePar; }
    public boolean isArchive() { return archive; }
    public void setArchive(boolean archive) { this.archive = archive; }
}
