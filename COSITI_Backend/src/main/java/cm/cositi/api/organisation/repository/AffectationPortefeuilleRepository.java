package cm.cositi.api.organisation.repository;

import cm.cositi.api.organisation.entite.AffectationPortefeuille;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AffectationPortefeuilleRepository extends JpaRepository<AffectationPortefeuille, UUID> {
    Optional<AffectationPortefeuille> findByAdherentIdAndDateFinIsNull(UUID adherentId);
    List<AffectationPortefeuille> findByAgentIdAndDateFinIsNull(UUID agentId);
    List<AffectationPortefeuille> findByAdherentIdIn(List<UUID> adherentIds);
}
