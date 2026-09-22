package cm.cositi.api.organisation.repository;

import cm.cositi.api.organisation.entite.Agent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgentRepository extends JpaRepository<Agent, UUID> {
    Optional<Agent> findByCodeAgent(String codeAgent);
    Optional<Agent> findByUtilisateurId(UUID utilisateurId);
    List<Agent> findByZoneIdAndArchiveFalse(UUID zoneId);
    List<Agent> findByChefAgentIdAndArchiveFalse(UUID chefAgentId);
    boolean existsByTelephone(String telephone);
}
