package cm.cositi.api.cotisation.repository;

import cm.cositi.api.cotisation.entite.RecommandationAllocationPaiement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RecommandationAllocationPaiementRepository extends JpaRepository<RecommandationAllocationPaiement, UUID> {
    Optional<RecommandationAllocationPaiement> findByPaiementId(UUID paiementId);
}
