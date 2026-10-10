package cm.cositi.api.adhesion.repository;

import cm.cositi.api.adhesion.entite.ControleDgaDocument;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ControleDgaDocumentRepository extends Repository<ControleDgaDocument, UUID> {

    ControleDgaDocument save(ControleDgaDocument document);

    Optional<ControleDgaDocument> findById(UUID id);

    List<ControleDgaDocument> findByControleIdOrderByTypeDocument(UUID controleId);
}
