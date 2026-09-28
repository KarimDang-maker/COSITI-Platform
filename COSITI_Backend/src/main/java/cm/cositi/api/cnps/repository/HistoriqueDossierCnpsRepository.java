package cm.cositi.api.cnps.repository;

import cm.cositi.api.cnps.entite.HistoriqueDossierCnps;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface HistoriqueDossierCnpsRepository extends JpaRepository<HistoriqueDossierCnps, UUID> {

    List<HistoriqueDossierCnps> findByDossierIdOrderByHorodatageDesc(UUID dossierId);
}
