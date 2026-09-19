package cm.cositi.api.adherent;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ActiviteRepository extends JpaRepository<Activite, UUID> {
    Optional<Activite> findByCode(String code);
}
