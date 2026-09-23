package cm.cositi.api.cotisation.repository;

import cm.cositi.api.cotisation.entite.RemiseCaisse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RemiseCaisseRepository extends JpaRepository<RemiseCaisse, UUID> {
    List<RemiseCaisse> findByAgentId(UUID agentId);
}
