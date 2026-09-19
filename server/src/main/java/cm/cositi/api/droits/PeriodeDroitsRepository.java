package cm.cositi.api.droits;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PeriodeDroitsRepository extends JpaRepository<PeriodeDroits, UUID> {
    List<PeriodeDroits> findByAdherentIdOrderByDateDebutAsc(UUID adherentId);
    List<PeriodeDroits> findByAdherentIdAndStatut(UUID adherentId, String statut);

    @Query("SELECT MAX(p.dateFin) FROM PeriodeDroits p WHERE p.adherentId = :adherentId AND p.statut = 'COUVERTE'")
    Optional<LocalDate> trouverDerniereDateCouverte(@Param("adherentId") UUID adherentId);
}
