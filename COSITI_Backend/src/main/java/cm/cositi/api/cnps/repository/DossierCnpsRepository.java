package cm.cositi.api.cnps.repository;

import cm.cositi.api.cnps.entite.DossierCnps;
import cm.cositi.api.cnps.entite.StatutDossierCnps;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DossierCnpsRepository extends JpaRepository<DossierCnps, UUID>, JpaSpecificationExecutor<DossierCnps> {

    Optional<DossierCnps> findByAdherentId(UUID adherentId);

    boolean existsByAdherentId(UUID adherentId);

    Page<DossierCnps> findByStatut(StatutDossierCnps statut, Pageable pageable);

    List<DossierCnps> findByAdherentIdIn(List<UUID> adherentIds);
}
