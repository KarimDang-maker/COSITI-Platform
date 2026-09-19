package cm.cositi.api.cnps;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "piece_dossier_cnps")
public class PieceDossierCnps {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dossier_id", nullable = false)
    private DossierCnps dossier;

    @Column(name = "type_piece", nullable = false, length = 60)
    private String typePiece; // CNI_RECTO, CNI_VERSO, ACTE_NAISSANCE, PHOTO_IDENTITE, FORMULAIRE_SIGNE

    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "statut", nullable = false, length = 20)
    private String statut = "ATTENDUE"; // ATTENDUE, FOURNIE, VALIDEE, REJETEE

    @Column(name = "obligatoire", nullable = false)
    private boolean obligatoire = true;

    @Column(name = "cree_le", nullable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "cree_par", length = 80)
    private String creePar;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public DossierCnps getDossier() { return dossier; }
    public void setDossier(DossierCnps dossier) { this.dossier = dossier; }
    public String getTypePiece() { return typePiece; }
    public void setTypePiece(String typePiece) { this.typePiece = typePiece; }
    public UUID getDocumentId() { return documentId; }
    public void setDocumentId(UUID documentId) { this.documentId = documentId; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    public boolean isObligatoire() { return obligatoire; }
    public void setObligatoire(boolean obligatoire) { this.obligatoire = obligatoire; }
    public Instant getCreeLe() { return creeLe; }
    public void setCreeLe(Instant creeLe) { this.creeLe = creeLe; }
    public String getCreePar() { return creePar; }
    public void setCreePar(String creePar) { this.creePar = creePar; }
}
