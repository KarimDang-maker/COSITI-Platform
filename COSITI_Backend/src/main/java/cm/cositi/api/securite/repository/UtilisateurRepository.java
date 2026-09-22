package cm.cositi.api.securite.repository;

import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, UUID> {
    Optional<Utilisateur> findByIdentifiant(String identifiant);
    boolean existsByIdentifiant(String identifiant);
    Optional<Utilisateur> findByAgentId(UUID agentId);
}
