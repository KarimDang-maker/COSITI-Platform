package cm.cositi.api.compterendu.repository;

import cm.cositi.api.compterendu.entite.CompteRendu;
import cm.cositi.api.compterendu.entite.StatutCompteRendu;
import cm.cositi.api.compterendu.entite.TypeCompteRendu;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.UUID;

public interface CompteRenduRepository extends JpaRepository<CompteRendu, UUID>,
        JpaSpecificationExecutor<CompteRendu> {

    Page<CompteRendu> findByDestinataireUtilisateurIdAndArchiveFalseOrderByPeriodeFinDesc(UUID destinataireId,
                                                                                          Pageable pageable);

    Page<CompteRendu> findByAuteurUtilisateurIdAndArchiveFalseOrderByPeriodeFinDesc(UUID auteurId,
                                                                                    Pageable pageable);

    Page<CompteRendu> findByTypeAndStatutAndArchiveFalseOrderByPeriodeFinDesc(TypeCompteRendu type,
                                                                              StatutCompteRendu statut,
                                                                              Pageable pageable);

    List<CompteRendu> findByIdInAndArchiveFalse(List<UUID> ids);
}
