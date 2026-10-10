package cm.cositi.api.adherent.repository;

import cm.cositi.api.adherent.entite.Association;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AssociationRepository extends JpaRepository<Association, UUID> {
}
