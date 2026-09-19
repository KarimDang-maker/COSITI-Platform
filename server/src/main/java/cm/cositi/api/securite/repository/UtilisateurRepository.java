package cm.cositi.api.securite.repository;

import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, UUID> {
    Optional<Utilisateur> findByIdentifiant(String identifiant);
    Optional<Utilisateur> findByEmail(String email);
    boolean existsByIdentifiant(String identifiant);
    boolean existsByEmail(String email);
}
