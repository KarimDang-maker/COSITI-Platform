package cm.cositi.api.cnps;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeclarationCnpsRepository extends JpaRepository<DeclarationCnps, UUID> {
    Optional<DeclarationCnps> findByDossierIdAndPeriodeMois(UUID dossierId, LocalDate periodeMois);
    List<DeclarationCnps> findByPeriodeMoisAndStatut(LocalDate periodeMois, String statut);
    List<DeclarationCnps> findByDossierIdOrderByPeriodeMoisDesc(UUID dossierId);
}
