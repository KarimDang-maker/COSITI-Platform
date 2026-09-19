package cm.cositi.api.securite.controleur;

import cm.cositi.api.securite.dto.ChangerMotDePasseDto;
import cm.cositi.api.securite.dto.ConnexionReponseDto;
import cm.cositi.api.securite.dto.ConnexionRequeteDto;
import cm.cositi.api.securite.dto.RafraichirRequeteDto;
import cm.cositi.api.securite.dto.UtilisateurMoiDto;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServiceAuthentification;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentification", description = "Endpoints d'accès et gestion des sessions JWT")
public class ControleurAuthentification {

    private final ServiceAuthentification serviceAuthentification;

    public ControleurAuthentification(ServiceAuthentification serviceAuthentification) {
        this.serviceAuthentification = serviceAuthentification;
    }

    @PostMapping("/connexion")
    @Operation(summary = "Authentification par identifiant et mot de passe")
    public ResponseEntity<ConnexionReponseDto> connexion(@Valid @RequestBody ConnexionRequeteDto requete) {
        return ResponseEntity.ok(serviceAuthentification.connecter(requete));
    }

    @PostMapping("/rafraichir")
    @Operation(summary = "Renouvellement du jeton d'accès via le refresh token")
    public ResponseEntity<ConnexionReponseDto> rafraichir(@Valid @RequestBody RafraichirRequeteDto requete) {
        return ResponseEntity.ok(serviceAuthentification.rafraichir(requete.jetonRafraichissement()));
    }

    @GetMapping("/moi")
    @Operation(summary = "Informations sur le compte connecté et ses permissions effectives")
    public ResponseEntity<UtilisateurMoiDto> moi(@AuthenticationPrincipal Utilisateur utilisateur) {
        return ResponseEntity.ok(serviceAuthentification.getUtilisateurConnecte(utilisateur));
    }

    @PostMapping("/mot-de-passe/changer")
    @Operation(summary = "Changement du mot de passe de l'utilisateur connecté")
    public ResponseEntity<Void> changerMotDePasse(
            @AuthenticationPrincipal Utilisateur utilisateur,
            @Valid @RequestBody ChangerMotDePasseDto dto) {
        serviceAuthentification.changerMotDePasse(utilisateur, dto);
        return ResponseEntity.noContent().build();
    }
}
