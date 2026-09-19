package cm.cositi.api.organisation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentRepository extends JpaRepository<Agent, UUID> {
    Optional<Agent> findByCodeAgent(String codeAgent);
    Optional<Agent> findByUtilisateurId(UUID utilisateurId);
    List<Agent> findByZoneId(UUID zoneId);
    List<Agent> findByChefAgentId(UUID chefAgentId);
    List<Agent> findByActifTrue();
}
