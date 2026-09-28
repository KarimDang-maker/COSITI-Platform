package cm.cositi.api.cnps.repository;

import cm.cositi.api.cnps.entite.OffreCnps;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OffreCnpsRepository extends JpaRepository<OffreCnps, UUID> {
    Optional<OffreCnps> findByCode(String code);

    List<OffreCnps> findByActifTrueOrderByRubriqueAscOrdreAffichageAsc();

    List<OffreCnps> findByRubriqueAndActifTrueOrderByOrdreAffichageAsc(String rubrique);
}
