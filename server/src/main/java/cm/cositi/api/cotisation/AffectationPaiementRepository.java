package cm.cositi.api.cotisation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AffectationPaiementRepository extends JpaRepository<AffectationPaiement, UUID> {
    List<AffectationPaiement> findByPaiementId(UUID paiementId);
}
