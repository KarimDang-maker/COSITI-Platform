package cm.cositi.api.cotisation.repository;

import cm.cositi.api.cotisation.entite.AffectationPaiement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AffectationPaiementRepository extends JpaRepository<AffectationPaiement, UUID> {
    List<AffectationPaiement> findByPaiementId(UUID paiementId);
}
