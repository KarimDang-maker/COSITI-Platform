package cm.cositi.api.notification;

import java.util.UUID;

/**
 * Notification déposée pour un utilisateur. Consommée <strong>après commit</strong> par le flux temps réel, qui la
 * pousse à son seul destinataire : une notification annulée par un rollback n'apparaît jamais à l'écran.
 */
public record NotificationCreeeEvent(UUID destinataireId, NotificationDto notification) {
}
