package cm.cositi.api.organisation.repository;

import cm.cositi.api.organisation.entite.ObjectifRecouvrement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ObjectifRecouvrementRepository extends JpaRepository<ObjectifRecouvrement, UUID> {
    Optional<ObjectifRecouvrement> findByAgentIdAndPeriode(UUID agentId, LocalDate periode);

    List<ObjectifRecouvrement> findByAgentIdOrderByPeriodeDesc(UUID agentId);
}
