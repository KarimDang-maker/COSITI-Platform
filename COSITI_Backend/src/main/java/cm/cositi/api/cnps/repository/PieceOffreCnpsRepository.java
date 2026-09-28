package cm.cositi.api.cnps.repository;

import cm.cositi.api.cnps.entite.PieceOffreCnps;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PieceOffreCnpsRepository extends JpaRepository<PieceOffreCnps, UUID> {
    List<PieceOffreCnps> findByOffreIdOrderByOrdreAffichageAsc(UUID offreId);

    List<PieceOffreCnps> findByOffreIdInOrderByOrdreAffichageAsc(List<UUID> offreIds);
}
