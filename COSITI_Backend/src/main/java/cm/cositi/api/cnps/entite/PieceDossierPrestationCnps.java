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
 * Pièce d'un dossier de prestation, rattachée à une {@link PieceOffreCnps} du référentiel de l'offre —
 * V16. Réutilise {@link StatutPieceCnps} (même vocabulaire ATTENDUE/FOURNIE/VALIDEE/REJETEE que
 * {@code piece_dossier_cnps}, pas de raison d'en inventer un second).
 */
@Entity
@Table(name = "piece_dossier_prestation_cnps")
public class PieceDossierPrestationCnps {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "dossier_id", nullable = false, updatable = false)
    private UUID dossierId;

    @Column(name = "piece_offre_id", nullable = false, updatable = false)
    private UUID pieceOffreId;

    @Column(name = "document_id")
    private UUID documentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutPieceCnps statut = StatutPieceCnps.ATTENDUE;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    @Column(name = "cree_par", updatable = false, length = 80)
    private String creePar;

    protected PieceDossierPrestationCnps() {
    }

    public PieceDossierPrestationCnps(UUID dossierId, UUID pieceOffreId, String creePar) {
        this.dossierId = dossierId;
        this.pieceOffreId = pieceOffreId;
        this.creePar = creePar;
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getDossierId() {
        return dossierId;
    }

    public UUID getPieceOffreId() {
        return pieceOffreId;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public StatutPieceCnps getStatut() {
        return statut;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
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
