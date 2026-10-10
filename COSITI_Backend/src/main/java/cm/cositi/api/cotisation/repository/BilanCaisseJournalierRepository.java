package cm.cositi.api.cotisation.repository;

import cm.cositi.api.cotisation.entite.BilanCaisseJournalier;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Volontairement restreint à l'écriture et à la lecture : aucune suppression physique d'un bilan de caisse
 * (AGENTS.md règle absolue n°3). Ne pas étendre {@code JpaRepository}, qui exposerait {@code delete}.
 */
public interface BilanCaisseJournalierRepository extends Repository<BilanCaisseJournalier, UUID>,
        JpaSpecificationExecutor<BilanCaisseJournalier> {

    BilanCaisseJournalier save(BilanCaisseJournalier bilan);

    BilanCaisseJournalier saveAndFlush(BilanCaisseJournalier bilan);

    Optional<BilanCaisseJournalier> findByDateBilan(LocalDate dateBilan);
}
