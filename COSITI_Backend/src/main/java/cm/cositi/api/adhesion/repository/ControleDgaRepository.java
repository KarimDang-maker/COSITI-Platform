package cm.cositi.api.adhesion.repository;

import cm.cositi.api.adhesion.entite.ControleDga;
import cm.cositi.api.adhesion.entite.StatutControle;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ControleDgaRepository extends Repository<ControleDga, UUID> {

    ControleDga save(ControleDga controle);

    ControleDga saveAndFlush(ControleDga controle);

    Optional<ControleDga> findById(UUID id);

    /** Verrou pessimiste pour toute décision : deux DGA ne peuvent pas décider en même temps du même tour. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM ControleDga c WHERE c.id = :id")
    Optional<ControleDga> verrouiller(@Param("id") UUID id);

    List<ControleDga> findByAdherentIdOrderByTourDesc(UUID adherentId);

    Optional<ControleDga> findFirstByAdherentIdOrderByTourDesc(UUID adherentId);

    Optional<ControleDga> findFirstByAdherentIdAndStatutIn(UUID adherentId, Collection<StatutControle> statuts);
}
