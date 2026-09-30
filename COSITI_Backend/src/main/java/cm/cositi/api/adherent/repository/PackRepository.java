package cm.cositi.api.adherent.repository;

import cm.cositi.api.adherent.entite.Pack;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PackRepository extends JpaRepository<Pack, UUID> {
    Optional<Pack> findByCode(String code);
}
