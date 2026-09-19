package cm.cositi.api.cnps;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DossierCnpsRepository extends JpaRepository<DossierCnps, UUID> {
    Optional<DossierCnps> findByAdherentId(UUID adherentId);
    Optional<DossierCnps> findByNumeroImmatriculation(String numeroImmatriculation);
    List<DossierCnps> findByStatut(String statut);
}
