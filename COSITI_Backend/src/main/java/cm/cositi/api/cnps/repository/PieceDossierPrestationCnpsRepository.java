package cm.cositi.api.cnps.repository;

import cm.cositi.api.cnps.entite.PieceDossierPrestationCnps;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PieceDossierPrestationCnpsRepository extends JpaRepository<PieceDossierPrestationCnps, UUID> {
    List<PieceDossierPrestationCnps> findByDossierId(UUID dossierId);

    Optional<PieceDossierPrestationCnps> findByDossierIdAndPieceOffreId(UUID dossierId, UUID pieceOffreId);
}
