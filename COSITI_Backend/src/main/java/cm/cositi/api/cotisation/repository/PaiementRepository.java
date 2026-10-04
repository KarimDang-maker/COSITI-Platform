package cm.cositi.api.cotisation.repository;

import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.StatutPaiement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaiementRepository extends JpaRepository<Paiement, UUID>, JpaSpecificationExecutor<Paiement> {
    Optional<Paiement> findByCleIdempotence(String cleIdempotence);
    Optional<Paiement> findByNumeroRecu(String numeroRecu);

    /**
     * #13 — même référence de transaction (insensible à la casse et aux espaces) sur un paiement actif du même
     * mode : une référence mobile money identifie une seule transaction réelle.
     */
    @Query("""
            SELECT p FROM Paiement p
            WHERE p.modePaiement = :mode
              AND p.referenceTransaction IS NOT NULL
              AND lower(trim(p.referenceTransaction)) = lower(trim(:reference))
              AND p.statut NOT IN :statutsExclus
            """)
    List<Paiement> trouverParReference(@Param("mode") String mode, @Param("reference") String reference,
                                       @Param("statutsExclus") Collection<StatutPaiement> statutsExclus);

    /** #13 — doublon potentiel : même adhérent, même date, même montant, même mode, paiement actif. */
    @Query("""
            SELECT p FROM Paiement p
            WHERE p.adherentId = :adherentId
              AND p.datePaiement = :date
              AND p.montant = :montant
              AND p.modePaiement = :mode
              AND p.statut NOT IN :statutsExclus
            """)
    List<Paiement> trouverDoublonsPotentiels(@Param("adherentId") UUID adherentId, @Param("date") LocalDate date,
                                             @Param("montant") BigDecimal montant, @Param("mode") String mode,
                                             @Param("statutsExclus") Collection<StatutPaiement> statutsExclus);
}
