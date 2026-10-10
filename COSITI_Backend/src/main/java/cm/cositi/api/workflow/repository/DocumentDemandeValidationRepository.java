package cm.cositi.api.workflow.repository;

import cm.cositi.api.workflow.entite.DocumentDemandeValidation;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.UUID;

public interface DocumentDemandeValidationRepository extends Repository<DocumentDemandeValidation, UUID> {

    DocumentDemandeValidation save(DocumentDemandeValidation document);

    List<DocumentDemandeValidation> findByDemandeIdOrderByAjouteLe(UUID demandeId);

    boolean existsByDemandeIdAndDocumentId(UUID demandeId, UUID documentId);
}
