package cm.cositi.api.cotisation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ComposanteAffectationRepository extends JpaRepository<ComposanteAffectation, UUID> {
    Optional<ComposanteAffectation> findByCode(String code);
}
