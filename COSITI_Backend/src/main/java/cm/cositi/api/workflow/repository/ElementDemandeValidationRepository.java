package cm.cositi.api.workflow.repository;

import cm.cositi.api.workflow.entite.ElementDemandeValidation;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ElementDemandeValidationRepository extends Repository<ElementDemandeValidation, UUID> {

    ElementDemandeValidation save(ElementDemandeValidation element);

    List<ElementDemandeValidation> findByDemandeIdOrderByChamp(UUID demandeId);

    /**
     * Remplacement des propositions d'une demande encore modifiable par son auteur (brouillon ou correction
     * demandée). Les propositions précédentes restent tracées dans le journal d'audit de la resoumission.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = false)
    @Query("DELETE FROM ElementDemandeValidation e WHERE e.demandeId = :demandeId")
    void remplacer(@Param("demandeId") UUID demandeId);
}
