package cm.cositi.api.adherent.repository;

import cm.cositi.api.adherent.entite.Activite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ActiviteRepository extends JpaRepository<Activite, UUID> {
    Optional<Activite> findByCode(String code);
}
