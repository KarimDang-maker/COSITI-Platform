package cm.cositi.api.adherent;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AyantDroitRepository extends JpaRepository<AyantDroit, UUID> {
    List<AyantDroit> findByAdherentId(UUID adherentId);
}
