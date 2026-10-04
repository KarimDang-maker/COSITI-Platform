package cm.cositi.api.adhesion.repository;

import cm.cositi.api.adhesion.entite.FraisAdhesion;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.Repository;

import java.util.Optional;
import java.util.UUID;

/** Aucune suppression physique d'un frais (AGENTS.md règle absolue n°3) : pas de {@code JpaRepository}. */
public interface FraisAdhesionRepository extends Repository<FraisAdhesion, UUID>, JpaSpecificationExecutor<FraisAdhesion> {

    FraisAdhesion save(FraisAdhesion frais);

    FraisAdhesion saveAndFlush(FraisAdhesion frais);

    Optional<FraisAdhesion> findById(UUID id);

    Optional<FraisAdhesion> findByAdherentIdAndTypeFrais(UUID adherentId, String typeFrais);

    Optional<FraisAdhesion> findByCleIdempotence(String cleIdempotence);
}
