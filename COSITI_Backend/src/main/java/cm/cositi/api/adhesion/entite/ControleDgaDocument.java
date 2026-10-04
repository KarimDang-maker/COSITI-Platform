package cm.cositi.api.adhesion.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Document justificatif contrôlé dans un tour (§4.2). {@code documentId} est nul quand la pièce attendue n'a pas
 * été téléversée : la DGA la constate alors {@code DOCUMENT_MANQUANT}.
 */
@Entity
@Table(name = "controle_dga_document")
public class ControleDgaDocument {

    public static final String A_VERIFIER = "A_VERIFIER";
    public static final String CONFORME = "CONFORME";
    public static final String ANOMALIE = "ANOMALIE";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "controle_id", nullable = false, updatable = false)
    private UUID controleId;

    @Column(name = "document_id", updatable = false)
    private UUID documentId;

    @Column(name = "type_document", nullable = false, updatable = false, length = 40)
    private String typeDocument;

    @Column(name = "obligatoire", nullable = false, updatable = false)
    private boolean obligatoire;

    @Column(name = "statut", nullable = false, length = 20)
    private String statut = A_VERIFIER;

    /** Exigence de la matrice documentaire contrôlée (V21) — nulle pour les tours ouverts avant V21. */
    @Column(name = "exigence_id", updatable = false)
    private UUID exigenceId;

    @Column(name = "niveau", updatable = false, length = 20)
    private String niveau;

    protected ControleDgaDocument() {
    }

    public ControleDgaDocument(UUID controleId, UUID documentId, String typeDocument, boolean obligatoire) {
        this.controleId = controleId;
        this.documentId = documentId;
        this.typeDocument = typeDocument;
        this.obligatoire = obligatoire;
    }

    public void rattacherExigence(UUID exigenceId, String niveau) {
        this.exigenceId = exigenceId;
        this.niveau = niveau;
    }

    public UUID getExigenceId() {
        return exigenceId;
    }

    public String getNiveau() {
        return niveau;
    }

    public UUID getId() {
        return id;
    }

    public UUID getControleId() {
        return controleId;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public String getTypeDocument() {
        return typeDocument;
    }

    public boolean isObligatoire() {
        return obligatoire;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }
}
