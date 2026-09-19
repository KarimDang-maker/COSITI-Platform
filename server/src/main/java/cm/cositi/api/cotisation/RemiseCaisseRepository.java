package cm.cositi.api.cotisation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RemiseCaisseRepository extends JpaRepository<RemiseCaisse, UUID> {
    List<RemiseCaisse> findByAgentIdOrderByDateRemiseDesc(UUID agentId);
    List<RemiseCaisse> findByStatut(String statut);
}
