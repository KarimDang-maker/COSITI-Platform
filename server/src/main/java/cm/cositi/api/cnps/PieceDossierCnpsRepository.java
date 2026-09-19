package cm.cositi.api.cnps;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PieceDossierCnpsRepository extends JpaRepository<PieceDossierCnps, UUID> {
    List<PieceDossierCnps> findByDossierId(UUID dossierId);
}
