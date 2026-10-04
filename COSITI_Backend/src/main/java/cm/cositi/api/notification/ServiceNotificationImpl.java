package cm.cositi.api.notification;

import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ServiceNotificationImpl implements ServiceNotification {

    private static final Logger JOURNAL = LoggerFactory.getLogger(ServiceNotificationImpl.class);

    private final NotificationRepository notificationRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ApplicationEventPublisher evenements;

    public ServiceNotificationImpl(NotificationRepository notificationRepository, JdbcTemplate jdbcTemplate,
                                   ApplicationEventPublisher evenements) {
        this.notificationRepository = notificationRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.evenements = evenements;
    }

    /** Enregistre puis annonce la notification : le flux temps réel la pousse à son destinataire après commit. */
    private void deposer(UUID destinataireId, String type, String titre, String corps, String entite, UUID entiteId) {
        Notification enregistree = notificationRepository.save(
                new Notification(destinataireId, type, titre, corps, entite, entiteId));
        evenements.publishEvent(new NotificationCreeeEvent(destinataireId, NotificationDto.depuis(enregistree)));
    }

    @Override
    @Transactional
    public void notifier(UUID destinataireId, String type, String titre, String corps, String entite, UUID entiteId) {
        if (destinataireId == null) {
            // Cas réel : une opération dont le destinataire attendu n'existe pas encore (zone sans Chef
            // désigné, par exemple). On ne fabrique pas de destinataire, on trace l'absence.
            JOURNAL.warn("Notification {} non déposée : aucun destinataire pour l'entité {} {}", type, entite, entiteId);
            return;
        }
        deposer(destinataireId, type, titre, corps, entite, entiteId);
    }

    @Override
    @Transactional
    public int notifierRoles(List<String> codesRoles, String type, String titre, String corps, String entite,
                              UUID entiteId) {
        return notifierRolesSauf(codesRoles, null, type, titre, corps, entite, entiteId);
    }

    @Override
    @Transactional
    public int notifierRolesSauf(List<String> codesRoles, UUID dejaNotifie, String type, String titre, String corps,
                                 String entite, UUID entiteId) {
        if (codesRoles == null || codesRoles.isEmpty()) {
            return 0;
        }
        // Lecture SQL directe plutôt que par le repository des utilisateurs : le paquetage `notification` est
        // consommé par presque tous les modules métier et ne doit pas, en retour, dépendre de `securite`.
        String marqueurs = String.join(",", java.util.Collections.nCopies(codesRoles.size(), "?"));
        String sql = """
                SELECT DISTINCT u.id
                FROM utilisateur u
                JOIN utilisateur_role ur ON ur.utilisateur_id = u.id
                JOIN role r ON r.id = ur.role_id
                WHERE u.actif = true AND r.code IN (%s)
                """.formatted(marqueurs);

        List<UUID> destinataires = jdbcTemplate.query(sql, (rs, ligne) -> (UUID) rs.getObject("id"),
                codesRoles.toArray());

        if (destinataires.isEmpty()) {
            JOURNAL.warn("Notification {} sans destinataire : aucun utilisateur actif ne porte {}", type, codesRoles);
            return 0;
        }
        List<UUID> servis = destinataires.stream().filter(id -> !id.equals(dejaNotifie)).toList();
        servis.forEach(id -> deposer(id, type, titre, corps, entite, entiteId));
        return servis.size() + (dejaNotifie != null && destinataires.contains(dejaNotifie) ? 1 : 0);
    }

    @Override
    public ReponsePaginee<NotificationDto> mesNotifications(boolean seulementNonLues, Pageable pageable,
                                                             Utilisateur demandeur) {
        Page<Notification> page = seulementNonLues
                ? notificationRepository.findByDestinataireUtilisateurIdAndLueFalseOrderByCreeLeDesc(
                        demandeur.getId(), pageable)
                : notificationRepository.findByDestinataireUtilisateurIdOrderByCreeLeDesc(demandeur.getId(), pageable);
        return ReponsePaginee.depuis(page.map(NotificationDto::depuis));
    }

    @Override
    public long compterNonLues(Utilisateur demandeur) {
        return notificationRepository.countByDestinataireUtilisateurIdAndLueFalse(demandeur.getId());
    }

    @Override
    @Transactional
    public NotificationDto marquerLue(UUID notificationId, Utilisateur demandeur) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("NOTIFICATION_INTROUVABLE",
                        "Notification introuvable."));

        // Aucune permission n'est vérifiée ici : la seule règle est qu'on ne lit et ne marque que les
        // siennes. Un contrôle par rôle laisserait passer un administrateur sur la boîte d'un autre.
        if (!notification.getDestinataireUtilisateurId().equals(demandeur.getId())) {
            throw new ExceptionAutorisation("NOTIFICATION_ETRANGERE",
                    "Cette notification ne vous est pas destinée.");
        }

        notification.marquerLue();
        return NotificationDto.depuis(notificationRepository.save(notification));
    }
}
