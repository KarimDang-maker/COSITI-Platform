package cm.cositi.api.compterendu.repository;

import cm.cositi.api.compterendu.entite.CompteRenduSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface CompteRenduSourceRepository extends JpaRepository<CompteRenduSource, CompteRenduSource.Cle> {

    @Query("SELECT s.cle.sourceId FROM CompteRenduSource s WHERE s.cle.consolideId = :consolideId")
    List<UUID> sourcesDuConsolide(UUID consolideId);

    @Query("SELECT s.cle.consolideId FROM CompteRenduSource s WHERE s.cle.sourceId = :sourceId")
    List<UUID> consolidesContenant(UUID sourceId);
}
