package cm.cositi.api.cnps.repository;

import cm.cositi.api.cnps.entite.HistoriqueDossierPrestationCnps;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface HistoriqueDossierPrestationCnpsRepository extends JpaRepository<HistoriqueDossierPrestationCnps, UUID> {
    List<HistoriqueDossierPrestationCnps> findByDossierIdOrderByHorodatageDesc(UUID dossierId);
}
