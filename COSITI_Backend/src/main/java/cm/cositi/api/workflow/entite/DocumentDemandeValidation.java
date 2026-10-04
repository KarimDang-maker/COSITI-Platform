package cm.cositi.api.workflow.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** Justificatif rattaché à une demande (§6.3) : référence vers un document sécurisé déjà téléversé. */
@Entity
@Table(name = "demande_validation_document")
public class DocumentDemandeValidation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "demande_id", nullable = false, updatable = false)
    private UUID demandeId;

    @Column(name = "document_id", nullable = false, updatable = false)
    private UUID documentId;

    @Column(name = "type_document", nullable = false, updatable = false, length = 40)
    private String typeDocument;

    @Column(name = "obligatoire", nullable = false)
    private boolean obligatoire;

    @Column(name = "ajoute_par", updatable = false)
    private UUID ajoutePar;

    @Column(name = "ajoute_le", nullable = false, updatable = false)
    private Instant ajouteLe;

    protected DocumentDemandeValidation() {
    }

    public DocumentDemandeValidation(UUID demandeId, UUID documentId, String typeDocument, boolean obligatoire,
                                     UUID ajoutePar) {
        this.demandeId = demandeId;
        this.documentId = documentId;
        this.typeDocument = typeDocument;
        this.obligatoire = obligatoire;
        this.ajoutePar = ajoutePar;
        this.ajouteLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getDemandeId() {
        return demandeId;
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

    public UUID getAjoutePar() {
        return ajoutePar;
    }

    public Instant getAjouteLe() {
        return ajouteLe;
    }
}
