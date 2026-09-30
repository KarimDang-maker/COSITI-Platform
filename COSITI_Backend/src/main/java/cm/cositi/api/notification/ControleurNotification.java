package cm.cositi.api.notification;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * docs/03_SPECIFICATIONS_API.md §10 — Notifications (jalon J8).
 *
 * <p>Aucun endpoint de création : une notification est produite par une opération métier, jamais déposée
 * directement par un client. Aucune permission dédiée non plus — chacun accède à ses propres notifications
 * et à aucune autre, règle appliquée par le service.</p>
 */
@RestController
@RequestMapping("/api/v1/notifications")
public class ControleurNotification {

    private final ServiceNotification serviceNotification;

    public ControleurNotification(ServiceNotification serviceNotification) {
        this.serviceNotification = serviceNotification;
    }

    @GetMapping
    public ReponsePaginee<NotificationDto> mesNotifications(
            @RequestParam(defaultValue = "false") boolean seulementNonLues,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceNotification.mesNotifications(seulementNonLues,
                PageRequest.of(page, Math.min(taille, 200)), demandeur);
    }

    @GetMapping("/non-lues/compte")
    public Map<String, Long> compterNonLues(@AuthenticationPrincipal Utilisateur demandeur) {
        return Map.of("nonLues", serviceNotification.compterNonLues(demandeur));
    }

    @PostMapping("/{id}/lue")
    public NotificationDto marquerLue(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceNotification.marquerLue(id, demandeur);
    }
}
