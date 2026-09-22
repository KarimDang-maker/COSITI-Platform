package cm.cositi.api.securite.controleur;

import cm.cositi.api.securite.dto.ChangerMotDePasseDto;
import cm.cositi.api.securite.dto.ConnexionDto;
import cm.cositi.api.securite.dto.JetonReponseDto;
import cm.cositi.api.securite.dto.ProfilDto;
import cm.cositi.api.securite.dto.RafraichirDto;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServiceAuthentification;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class ControleurAuthentification {

    private final ServiceAuthentification serviceAuthentification;

    public ControleurAuthentification(ServiceAuthentification serviceAuthentification) {
        this.serviceAuthentification = serviceAuthentification;
    }

    @PostMapping("/connexion")
    public ResponseEntity<JetonReponseDto> connexion(@Valid @RequestBody ConnexionDto dto, HttpServletRequest requete) {
        JetonReponseDto reponse = serviceAuthentification.connecter(
                dto.identifiant(), dto.motDePasse(), requete.getRemoteAddr(), requete.getHeader("User-Agent"));
        return ResponseEntity.ok(reponse);
    }

    @PostMapping("/rafraichir")
    public ResponseEntity<JetonReponseDto> rafraichir(@Valid @RequestBody RafraichirDto dto, HttpServletRequest requete) {
        JetonReponseDto reponse = serviceAuthentification.rafraichir(
                dto.jetonRafraichissement(), requete.getRemoteAddr(), requete.getHeader("User-Agent"));
        return ResponseEntity.ok(reponse);
    }

    @PostMapping("/deconnexion")
    public ResponseEntity<Void> deconnexion(@Valid @RequestBody RafraichirDto dto,
                                             @AuthenticationPrincipal Utilisateur utilisateur) {
        serviceAuthentification.deconnecter(dto.jetonRafraichissement(), utilisateur);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mot-de-passe/changer")
    public ResponseEntity<Void> changerMotDePasse(@Valid @RequestBody ChangerMotDePasseDto dto,
                                                   @AuthenticationPrincipal Utilisateur utilisateur) {
        serviceAuthentification.changerMotDePasse(utilisateur, dto);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @GetMapping("/moi")
    public ResponseEntity<ProfilDto> moi(@AuthenticationPrincipal Utilisateur utilisateur) {
        return ResponseEntity.ok(serviceAuthentification.profil(utilisateur));
    }
}
