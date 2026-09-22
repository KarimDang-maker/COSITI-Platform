package cm.cositi.api.adherent.repository;

import cm.cositi.api.adherent.entite.Adherent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AdherentRepository extends JpaRepository<Adherent, UUID>, JpaSpecificationExecutor<Adherent> {

    Optional<Adherent> findByMatricule(String matricule);

    List<Adherent> findByTelephonePrincipalAndArchiveFalse(String telephonePrincipal);

    List<Adherent> findByNumeroCniAndArchiveFalse(String numeroCni);

    /**
     * Recherche de doublon par similarité de nom (extension {@code pg_trgm}), restreinte à la même zone
     * (docs/02_CLASSES_ET_METHODES.md §3 — ServiceDoublonAdherent). Le seuil est appliqué en SQL pour exploiter
     * l'index GIN {@code idx_adherent_noms_trgm}.
     */
    @Query(value = """
            SELECT a.id AS id, similarity(a.nom, :nom) AS score
            FROM adherent a
            WHERE a.archive = false
              AND a.zone_id = :zoneId
              AND similarity(a.nom, :nom) >= :seuil
            ORDER BY score DESC
            LIMIT 10
            """, nativeQuery = true)
    List<CandidatSimilariteProjection> rechercherParSimilariteNom(@Param("nom") String nom, @Param("zoneId") UUID zoneId,
                                                                   @Param("seuil") double seuil);

    boolean existsByNumeroCniAndArchiveFalse(String numeroCni);
}
