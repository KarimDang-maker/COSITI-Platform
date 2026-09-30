package cm.cositi.api.cnps.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Pièce attendue puis fournie dans un dossier CNPS. Table {@code piece_dossier_cnps} (V4) : porte
 * {@code cree_le}/{@code cree_par} mais ni {@code modifie_le} ni {@code modifie_par}, elle n'étend donc pas
 * {@code EntiteAuditable}.
 */
@Entity
@Table(name = "piece_dossier_cnps")
public class PieceDossierCnps {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "dossier_id", nullable = false, updatable = false)
    private UUID dossierId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_piece", nullable = false, length = 60)
    private TypePieceCnps typePiece;

    @Column(name = "document_id")
    private UUID documentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutPieceCnps statut = StatutPieceCnps.ATTENDUE;

    @Column(name = "obligatoire", nullable = false)
    private boolean obligatoire = true;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    @Column(name = "cree_par", updatable = false, length = 80)
    private String creePar;

    protected PieceDossierCnps() {
    }

    public PieceDossierCnps(UUID dossierId, TypePieceCnps typePiece, boolean obligatoire, String creePar) {
        this.dossierId = dossierId;
        this.typePiece = typePiece;
        this.obligatoire = obligatoire;
        this.creePar = creePar;
        // Renseigné ici plutôt que laissé au DEFAULT now() : Hibernate envoie explicitement NULL pour une
        // colonne non renseignée et écrase le DEFAULT (bug corrigé au jalon J2 sur Adhesion/AyantDroit).
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getDossierId() {
        return dossierId;
    }

    public TypePieceCnps getTypePiece() {
        return typePiece;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public StatutPieceCnps getStatut() {
        return statut;
    }

    public void setStatut(StatutPieceCnps statut) {
        this.statut = statut;
    }

    public boolean isObligatoire() {
        return obligatoire;
    }

    public Instant getCreeLe() {
        return creeLe;
    }

    public String getCreePar() {
        return creePar;
    }

    /** Rattache un document et bascule la pièce en FOURNIE. La validation reste une action humaine distincte. */
    public void rattacher(UUID documentId) {
        this.documentId = documentId;
        this.statut = StatutPieceCnps.FOURNIE;
    }
}
