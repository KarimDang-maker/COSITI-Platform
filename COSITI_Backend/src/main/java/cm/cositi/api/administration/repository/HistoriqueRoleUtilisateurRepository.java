package cm.cositi.api.administration.repository;

import cm.cositi.api.administration.entite.HistoriqueRoleUtilisateur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface HistoriqueRoleUtilisateurRepository extends JpaRepository<HistoriqueRoleUtilisateur, UUID> {

    List<HistoriqueRoleUtilisateur> findByUtilisateurIdOrderByHorodatageDesc(UUID utilisateurId);
}
