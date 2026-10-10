package cm.cositi.api.cnps.repository;

import cm.cositi.api.cnps.entite.PieceDossierCnps;
import cm.cositi.api.cnps.entite.TypePieceCnps;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PieceDossierCnpsRepository extends JpaRepository<PieceDossierCnps, UUID> {

    List<PieceDossierCnps> findByDossierIdOrderByTypePiece(UUID dossierId);

    Optional<PieceDossierCnps> findByDossierIdAndTypePiece(UUID dossierId, TypePieceCnps typePiece);
}
