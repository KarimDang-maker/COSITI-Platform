package cm.cositi.api.relance.repository;

import cm.cositi.api.relance.entite.Relance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.UUID;

public interface RelanceRepository extends JpaRepository<Relance, UUID>, JpaSpecificationExecutor<Relance> {

    List<Relance> findByAdherentIdOrderByDateContactDesc(UUID adherentId);

    Page<Relance> findByCampagneIdOrderByDateContactDesc(UUID campagneId, Pageable pageable);

    long countByCampagneId(UUID campagneId);
}
