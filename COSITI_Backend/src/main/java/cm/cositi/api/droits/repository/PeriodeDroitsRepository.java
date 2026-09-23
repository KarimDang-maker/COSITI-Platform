package cm.cositi.api.droits.repository;

import cm.cositi.api.droits.entite.PeriodeDroits;
import cm.cositi.api.droits.entite.StatutPeriode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PeriodeDroitsRepository extends JpaRepository<PeriodeDroits, UUID> {

    List<PeriodeDroits> findByAdherentIdOrderByDateDebutAsc(UUID adherentId);

    List<PeriodeDroits> findByAdherentIdAndStatutNotOrderByDateDebutAsc(UUID adherentId, StatutPeriode statutExclu);

    /** Dernière période non annulée (la plus avancée dans le temps) — base de la prochaine imputation. */
    Optional<PeriodeDroits> findFirstByAdherentIdAndStatutNotOrderByDateFinDesc(UUID adherentId, StatutPeriode statutExclu);

    /**
     * Contrôle de chevauchement avant insertion (AGENTS.md, docs/02_CLASSES_ET_METHODES.md §5) : toute période
     * non annulée de l'adhérent dont l'intervalle [dateDebut, dateFin] croise celui proposé.
     */
    @Query("""
            SELECT p FROM PeriodeDroits p
            WHERE p.adherentId = :adherentId AND p.statut <> cm.cositi.api.droits.entite.StatutPeriode.ANNULEE
              AND p.dateDebut <= :dateFin AND p.dateFin >= :dateDebut
            """)
    List<PeriodeDroits> rechercherChevauchement(@Param("adherentId") UUID adherentId,
                                                 @Param("dateDebut") LocalDate dateDebut,
                                                 @Param("dateFin") LocalDate dateFin);
}
