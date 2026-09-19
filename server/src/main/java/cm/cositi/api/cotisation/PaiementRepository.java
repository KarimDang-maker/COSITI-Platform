package cm.cositi.api.cotisation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaiementRepository extends JpaRepository<Paiement, UUID> {
    Optional<Paiement> findByNumeroRecu(String numeroRecu);
    Optional<Paiement> findByCleIdempotence(String cleIdempotence);
    List<Paiement> findByAdherentIdOrderByDatePaiementDesc(UUID adherentId);

    @Query(value = "SELECT nextval('seq_numero_recu')", nativeQuery = true)
    Long obtenirProchaineValeurSequenceRecu();

    @Query("SELECT p FROM Paiement p WHERE " +
           "(:adherentId IS NULL OR p.adherentId = :adherentId) AND " +
           "(:statut IS NULL OR p.statut = :statut) AND " +
           "(:dateDu IS NULL OR p.datePaiement >= :dateDu) AND " +
           "(:dateAu IS NULL OR p.datePaiement <= :dateAu)")
    Page<Paiement> rechercher(@Param("adherentId") UUID adherentId,
                             @Param("statut") String statut,
                             @Param("dateDu") LocalDate dateDu,
                             @Param("dateAu") LocalDate dateAu,
                             Pageable pageable);
}
