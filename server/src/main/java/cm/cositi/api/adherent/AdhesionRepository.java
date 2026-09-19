package cm.cositi.api.adherent;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AdhesionRepository extends JpaRepository<Adhesion, UUID> {
    Optional<Adhesion> findByAdherentIdAndDateFinIsNull(UUID adherentId);
    List<Adhesion> findByAdherentIdOrderByDateDebutDesc(UUID adherentId);
}
