package cm.cositi.api.parametre;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ParametreRepository extends JpaRepository<Parametre, UUID> {
    Optional<Parametre> findByCle(String cle);
}
