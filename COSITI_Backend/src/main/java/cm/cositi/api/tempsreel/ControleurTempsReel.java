package cm.cositi.api.tempsreel;

import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/temps-reel")
@Tag(name = "Temps réel", description = "Signaux de changement poussés aux navigateurs (Server-Sent Events)")
public class ControleurTempsReel {

    private final ServiceDiffusionTempsReel diffusion;

    public ControleurTempsReel(ServiceDiffusionTempsReel diffusion) {
        this.diffusion = diffusion;
    }

    @Operation(summary = "Flux des changements",
            description = "Flux text/event-stream authentifié par l'en-tête Authorization. Événements `changement` "
                    + "{domaine, id, adherentId, typeChangement, horodatage}, sans donnée métier : le client recharge "
                    + "la ressource par l'API. Domaines filtrés selon les permissions de lecture. Le flux se ferme "
                    + "après 10 minutes ; le client le rouvre avec un jeton frais.")
    @GetMapping(value = "/flux", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter flux(@AuthenticationPrincipal Utilisateur utilisateur, HttpServletResponse reponse) {
        // Empêche un proxy inverse (nginx) de retenir les événements dans un tampon.
        reponse.setHeader("X-Accel-Buffering", "no");
        reponse.setHeader("Cache-Control", "no-store");
        return diffusion.abonner(utilisateur);
    }
}
