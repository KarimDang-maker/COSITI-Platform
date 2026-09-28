package cm.cositi.api.cotisation.repository;

import cm.cositi.api.cotisation.entite.Paiement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface PaiementRepository extends JpaRepository<Paiement, UUID>, JpaSpecificationExecutor<Paiement> {
    Optional<Paiement> findByCleIdempotence(String cleIdempotence);
    Optional<Paiement> findByNumeroRecu(String numeroRecu);
}
