package cm.cositi.api.cnps.repository;

import cm.cositi.api.cnps.entite.DossierPrestationCnps;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DossierPrestationCnpsRepository
        extends JpaRepository<DossierPrestationCnps, java.util.UUID>, JpaSpecificationExecutor<DossierPrestationCnps> {
}
