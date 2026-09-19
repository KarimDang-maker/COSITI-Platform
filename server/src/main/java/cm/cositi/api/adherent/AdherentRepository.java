package cm.cositi.api.adherent;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AdherentRepository extends JpaRepository<Adherent, UUID> {
    Optional<Adherent> findByMatricule(String matricule);
    Optional<Adherent> findByTelephonePrincipal(String telephone);
    Optional<Adherent> findByNumeroCni(String numeroCni);

    boolean existsByTelephonePrincipal(String telephone);
    boolean existsByNumeroCni(String numeroCni);

    Page<Adherent> findByZoneId(UUID zoneId, Pageable pageable);
    Page<Adherent> findByStatut(String statut, Pageable pageable);

    @Query(value = "SELECT nextval('seq_matricule_adherent')", nativeQuery = true)
    Long obtenirProchaineValeurSequenceMatricule();

    @Query("SELECT a FROM Adherent a WHERE " +
           "(:recherche IS NULL OR LOWER(a.nom) LIKE LOWER(CONCAT('%', :recherche, '%')) OR " +
           "LOWER(a.prenoms) LIKE LOWER(CONCAT('%', :recherche, '%')) OR " +
           "a.matricule LIKE CONCAT('%', :recherche, '%') OR " +
           "a.telephonePrincipal LIKE CONCAT('%', :recherche, '%')) AND " +
           "(:zoneId IS NULL OR a.zone.id = :zoneId) AND " +
           "(:statut IS NULL OR a.statut = :statut)")
    Page<Adherent> rechercher(@Param("recherche") String recherche,
                             @Param("zoneId") UUID zoneId,
                             @Param("statut") String statut,
                             Pageable pageable);
}
