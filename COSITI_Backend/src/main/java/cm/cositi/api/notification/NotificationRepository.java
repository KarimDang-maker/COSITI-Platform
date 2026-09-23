package cm.cositi.api.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByDestinataireUtilisateurIdOrderByCreeLeDesc(UUID destinataireId, Pageable pageable);

    Page<Notification> findByDestinataireUtilisateurIdAndLueFalseOrderByCreeLeDesc(UUID destinataireId,
                                                                                    Pageable pageable);

    long countByDestinataireUtilisateurIdAndLueFalse(UUID destinataireId);
}
