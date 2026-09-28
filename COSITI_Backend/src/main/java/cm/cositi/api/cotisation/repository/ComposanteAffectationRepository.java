package cm.cositi.api.cotisation.repository;

import cm.cositi.api.cotisation.entite.ComposanteAffectation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ComposanteAffectationRepository extends JpaRepository<ComposanteAffectation, UUID> {
    Optional<ComposanteAffectation> findByCode(String code);
}
