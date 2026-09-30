package cm.cositi.api.adherent.repository;

import cm.cositi.api.adherent.entite.Adhesion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AdhesionRepository extends JpaRepository<Adhesion, UUID> {
    Optional<Adhesion> findByAdherentIdAndDateFinIsNull(UUID adherentId);
}
