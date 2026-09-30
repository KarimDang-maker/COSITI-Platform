package cm.cositi.api.organisation.repository;

import cm.cositi.api.organisation.entite.Zone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ZoneRepository extends JpaRepository<Zone, UUID> {
    Optional<Zone> findByCode(String code);
}
