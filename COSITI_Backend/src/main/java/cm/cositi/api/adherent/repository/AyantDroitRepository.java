package cm.cositi.api.adherent.repository;

import cm.cositi.api.adherent.entite.AyantDroit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AyantDroitRepository extends JpaRepository<AyantDroit, UUID> {
    List<AyantDroit> findByAdherentId(UUID adherentId);
}
