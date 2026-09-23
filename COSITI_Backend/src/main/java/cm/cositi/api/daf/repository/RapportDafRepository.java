package cm.cositi.api.daf.repository;

import cm.cositi.api.daf.entite.RapportDaf;
import cm.cositi.api.daf.entite.StatutRapportDaf;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RapportDafRepository extends JpaRepository<RapportDaf, UUID> {

    Page<RapportDaf> findByStatutOrderByPeriodeFinDesc(StatutRapportDaf statut, Pageable pageable);

    Page<RapportDaf> findAllByOrderByPeriodeFinDesc(Pageable pageable);

    long countByStatut(StatutRapportDaf statut);
}
