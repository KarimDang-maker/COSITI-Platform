package cm.cositi.api.adherent.repository;

import cm.cositi.api.adherent.entite.PreferenceAllocationAdherent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PreferenceAllocationAdherentRepository extends JpaRepository<PreferenceAllocationAdherent, UUID> {
    Optional<PreferenceAllocationAdherent> findByAdherentIdAndActifTrue(UUID adherentId);
}
