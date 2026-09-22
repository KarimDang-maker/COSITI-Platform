package cm.cositi.api.securite.repository;

import cm.cositi.api.securite.entite.JetonRafraichissement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JetonRafraichissementRepository extends JpaRepository<JetonRafraichissement, UUID> {
    Optional<JetonRafraichissement> findByJetonHash(String jetonHash);
    List<JetonRafraichissement> findByFamilleId(UUID familleId);
    List<JetonRafraichissement> findByUtilisateurIdAndRevoqueFalse(UUID utilisateurId);
}
