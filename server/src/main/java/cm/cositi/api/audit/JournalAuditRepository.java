package cm.cositi.api.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface JournalAuditRepository extends JpaRepository<JournalAudit, UUID> {
    Page<JournalAudit> findByEntiteOrderByHorodatageDesc(String entite, Pageable pageable);
    Page<JournalAudit> findByUtilisateurIdentifiantOrderByHorodatageDesc(String identifiant, Pageable pageable);
}
