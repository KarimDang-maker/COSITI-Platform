package cm.cositi.api.organisation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AffectationPortefeuilleRepository extends JpaRepository<AffectationPortefeuille, UUID> {
    Optional<AffectationPortefeuille> findByAdherentIdAndDateFinIsNull(UUID adherentId);
    List<AffectationPortefeuille> findByAgentIdAndDateFinIsNull(UUID agentId);
    List<AffectationPortefeuille> findByAdherentIdOrderByDateDebutDesc(UUID adherentId);
}
