package cm.cositi.api.workflow.repository;

import cm.cositi.api.workflow.entite.DemandeValidation;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Aucune suppression physique d'une demande (AGENTS.md règle absolue n°3) : pas de {@code JpaRepository}. */
public interface DemandeValidationRepository extends Repository<DemandeValidation, UUID>,
        JpaSpecificationExecutor<DemandeValidation> {

    DemandeValidation save(DemandeValidation demande);

    DemandeValidation saveAndFlush(DemandeValidation demande);

    Optional<DemandeValidation> findById(UUID id);

    /** Verrou pessimiste pour toute transition : deux décisions concurrentes ne peuvent pas s'entrelacer. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM DemandeValidation d WHERE d.id = :id")
    Optional<DemandeValidation> verrouiller(@Param("id") UUID id);

    Optional<DemandeValidation> findByReference(String reference);

    Optional<DemandeValidation> findByCleIdempotence(String cleIdempotence);

    List<DemandeValidation> findByTypeEntiteAndEntiteIdOrderByDemandeLeDesc(TypeEntiteWorkflow typeEntite, UUID entiteId);

    List<DemandeValidation> findByTypeEntiteAndEntiteIdAndTypeOperationInOrderByDemandeLeDesc(
            TypeEntiteWorkflow typeEntite, UUID entiteId, Collection<TypeOperationWorkflow> operations);

    Optional<DemandeValidation> findFirstByTypeEntiteAndEntiteIdAndStatutIn(TypeEntiteWorkflow typeEntite, UUID entiteId,
                                                                           Collection<StatutDemandeValidation> statuts);

    boolean existsByTypeEntiteAndEntiteIdAndStatutIn(TypeEntiteWorkflow typeEntite, UUID entiteId,
                                                     Collection<StatutDemandeValidation> statuts);
}
