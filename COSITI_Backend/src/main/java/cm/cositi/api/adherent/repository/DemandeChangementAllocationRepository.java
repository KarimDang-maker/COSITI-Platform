package cm.cositi.api.adherent.repository;

import cm.cositi.api.adherent.entite.DemandeChangementAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DemandeChangementAllocationRepository extends JpaRepository<DemandeChangementAllocation, UUID> {
    Optional<DemandeChangementAllocation> findByAdherentIdAndStatut(UUID adherentId,
                                                                     DemandeChangementAllocation.Statut statut);

    List<DemandeChangementAllocation> findByAdherentIdOrderByProposeeLeDesc(UUID adherentId);

    List<DemandeChangementAllocation> findByStatutOrderByProposeeLeAsc(DemandeChangementAllocation.Statut statut);
}
