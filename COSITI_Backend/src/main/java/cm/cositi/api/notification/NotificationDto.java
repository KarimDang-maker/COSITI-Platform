package cm.cositi.api.notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(
        UUID id,
        String type,
        String titre,
        String corps,
        String entite,
        UUID entiteId,
        boolean lue,
        Instant creeLe
) {
    public static NotificationDto depuis(Notification n) {
        return new NotificationDto(n.getId(), n.getType(), n.getTitre(), n.getCorps(), n.getEntite(),
                n.getEntiteId(), n.isLue(), n.getCreeLe());
    }
}
