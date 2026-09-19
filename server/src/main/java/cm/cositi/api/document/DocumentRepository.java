package cm.cositi.api.document;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findByAdherentId(UUID adherentId);
    Optional<Document> findByEmpreinteSha256(String sha256);
}
