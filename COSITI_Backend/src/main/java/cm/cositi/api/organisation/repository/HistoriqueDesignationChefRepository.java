package cm.cositi.api.organisation.repository;

import cm.cositi.api.organisation.entite.HistoriqueDesignationChef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HistoriqueDesignationChefRepository extends JpaRepository<HistoriqueDesignationChef, UUID> {
    Optional<HistoriqueDesignationChef> findTopByZoneIdOrderByHorodatageDesc(UUID zoneId);
    List<HistoriqueDesignationChef> findByZoneIdOrderByHorodatageDesc(UUID zoneId);
    List<HistoriqueDesignationChef> findByAgentIdOrderByHorodatageDesc(UUID agentId);
}
