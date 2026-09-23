package cm.cositi.api.cnps.repository;

import cm.cositi.api.cnps.entite.DeclarationCnps;
import cm.cositi.api.cnps.entite.StatutDeclarationCnps;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeclarationCnpsRepository extends JpaRepository<DeclarationCnps, UUID> {

    Optional<DeclarationCnps> findByDossierIdAndPeriodeMois(UUID dossierId, LocalDate periodeMois);

    List<DeclarationCnps> findByDossierIdOrderByPeriodeMoisDesc(UUID dossierId);

    List<DeclarationCnps> findByPeriodeMoisAndStatut(LocalDate periodeMois, StatutDeclarationCnps statut);

    List<DeclarationCnps> findByPeriodeMois(LocalDate periodeMois);
}
