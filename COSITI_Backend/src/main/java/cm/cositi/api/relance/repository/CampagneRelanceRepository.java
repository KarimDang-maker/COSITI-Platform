package cm.cositi.api.relance.repository;

import cm.cositi.api.relance.entite.CampagneRelance;
import cm.cositi.api.relance.entite.StatutCampagne;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CampagneRelanceRepository extends JpaRepository<CampagneRelance, UUID> {

    Page<CampagneRelance> findByStatutOrderByDateDebutDesc(StatutCampagne statut, Pageable pageable);

    Page<CampagneRelance> findAllByOrderByDateDebutDesc(Pageable pageable);
}
