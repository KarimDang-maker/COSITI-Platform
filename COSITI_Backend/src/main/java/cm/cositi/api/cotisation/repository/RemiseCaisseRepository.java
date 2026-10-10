package cm.cositi.api.cotisation.repository;

import cm.cositi.api.cotisation.entite.RemiseCaisse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.UUID;

public interface RemiseCaisseRepository extends JpaRepository<RemiseCaisse, UUID>, JpaSpecificationExecutor<RemiseCaisse> {
    List<RemiseCaisse> findByAgentId(UUID agentId);
}
