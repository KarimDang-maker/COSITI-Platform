package cm.cositi.api.parametre;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ParametreRepository extends JpaRepository<Parametre, UUID> {
    Optional<Parametre> findByCle(String cle);
}
