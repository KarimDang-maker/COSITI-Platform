package cm.cositi.api.document.repository;

import cm.cositi.api.document.entite.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID>, JpaSpecificationExecutor<Document> {

    List<Document> findByAdherentIdAndArchiveFalseOrderByCreeLeDesc(UUID adherentId);

    List<Document> findByPaiementIdAndArchiveFalseOrderByCreeLeDesc(UUID paiementId);

    /** Détection de doublon de téléversement : même contenu déjà présent pour le même adhérent. */
    Optional<Document> findFirstByEmpreinteSha256AndAdherentIdAndArchiveFalse(String empreinteSha256, UUID adherentId);
}
