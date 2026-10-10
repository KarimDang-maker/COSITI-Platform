package cm.cositi.api.workflow.repository;

import cm.cositi.api.workflow.entite.DecisionDemandeValidation;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Journal append-only : création et lecture uniquement. */
public interface DecisionDemandeValidationRepository extends Repository<DecisionDemandeValidation, UUID> {

    DecisionDemandeValidation save(DecisionDemandeValidation decision);

    List<DecisionDemandeValidation> findByDemandeIdOrderByDecideLe(UUID demandeId);

    Optional<DecisionDemandeValidation> findByCleIdempotence(String cleIdempotence);
}
