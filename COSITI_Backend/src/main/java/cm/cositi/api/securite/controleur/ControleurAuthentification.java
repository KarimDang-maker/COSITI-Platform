package cm.cositi.api.securite.controleur;

import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.config.JwtProperties;
import cm.cositi.api.securite.dto.ChangerMotDePasseDto;
import cm.cositi.api.securite.dto.ConnexionDto;
import cm.cositi.api.securite.dto.JetonReponseDto;
import cm.cositi.api.securite.dto.ProfilDto;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ResultatAuthentification;
import cm.cositi.api.securite.service.ServiceAuthentification;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Le jeton de rafraîchissement ne transite jamais dans un corps JSON (voir {@code JetonReponseDto}) : il est
 * posé/lu exclusivement via un cookie {@code HttpOnly}, {@code Secure}, {@code SameSite=Strict}, comme l'exige
 * `docs/04_SECURITE.md §2` et comme le suppose le frontend (`api/client.ts`, `credentials: "include"`, aucune
 * lecture de jeton de rafraîchissement en JavaScript).
 *
 * <p>{@code Secure} est inconditionnel, y compris en recette locale : les navigateurs traitent
 * {@code localhost} comme une origine de confiance et acceptent un cookie {@code Secure} sur HTTP
 * clair. Vérifié au jalon J12 — aucun interrupteur n'est donc nécessaire, et aucun ne doit être
 * introduit : un drapeau abaissant cette protection finirait par être activé ailleurs qu'en local.</p>
 */
@RestController
@RequestMapping("/api/v1/auth")
public class ControleurAuthentification {

    static final String NOM_COOKIE_RAFRAICHISSEMENT = "jetonRafraichissement";
    private static final String CHEMIN_COOKIE = "/api/v1/auth";

    private final ServiceAuthentification serviceAuthentification;
    private final JwtProperties jwtProperties;

    public ControleurAuthentification(ServiceAuthentification serviceAuthentification, JwtProperties jwtProperties) {
        this.serviceAuthentification = serviceAuthentification;
        this.jwtProperties = jwtProperties;
    }

    @PostMapping("/connexion")
    public ResponseEntity<JetonReponseDto> connexion(@Valid @RequestBody ConnexionDto dto, HttpServletRequest requete) {
        ResultatAuthentification resultat = serviceAuthentification.connecter(
                dto.identifiant(), dto.motDePasse(), requete.getRemoteAddr(), requete.getHeader("User-Agent"));
        return reponseAvecCookie(resultat);
    }

    @PostMapping("/rafraichir")
    public ResponseEntity<JetonReponseDto> rafraichir(
            @CookieValue(name = NOM_COOKIE_RAFRAICHISSEMENT, required = false) String jetonRafraichissement,
            HttpServletRequest requete) {
        if (jetonRafraichissement == null || jetonRafraichissement.isBlank()) {
            throw new ExceptionMetier("JETON_RAFRAICHISSEMENT_ABSENT",
                    "Aucune session à rafraîchir : reconnectez-vous.", HttpStatus.UNAUTHORIZED);
        }
        ResultatAuthentification resultat = serviceAuthentification.rafraichir(
                jetonRafraichissement, requete.getRemoteAddr(), requete.getHeader("User-Agent"));
        return reponseAvecCookie(resultat);
    }

    @PostMapping("/deconnexion")
    public ResponseEntity<Void> deconnexion(
            @CookieValue(name = NOM_COOKIE_RAFRAICHISSEMENT, required = false) String jetonRafraichissement,
            @AuthenticationPrincipal Utilisateur utilisateur) {
        if (jetonRafraichissement != null && !jetonRafraichissement.isBlank()) {
            serviceAuthentification.deconnecter(jetonRafraichissement, utilisateur);
        }
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookieExpire().toString()).build();
    }

    @PostMapping("/mot-de-passe/changer")
    public ResponseEntity<Void> changerMotDePasse(@Valid @RequestBody ChangerMotDePasseDto dto,
                                                   @AuthenticationPrincipal Utilisateur utilisateur) {
        serviceAuthentification.changerMotDePasse(utilisateur, dto);
        // Le changement de mot de passe révoque toutes les sessions côté serveur : le cookie local doit
        // disparaître aussi, sans quoi le navigateur retenterait un rafraîchissement voué à l'échec.
        return ResponseEntity.status(HttpStatus.NO_CONTENT)
                .header(HttpHeaders.SET_COOKIE, cookieExpire().toString()).build();
    }

    @GetMapping("/moi")
    public ResponseEntity<ProfilDto> moi(@AuthenticationPrincipal Utilisateur utilisateur) {
        return ResponseEntity.ok(serviceAuthentification.profil(utilisateur));
    }

    private ResponseEntity<JetonReponseDto> reponseAvecCookie(ResultatAuthentification resultat) {
        JetonReponseDto corps = new JetonReponseDto(resultat.jetonAcces(), resultat.expirationAccesSecondes(),
                resultat.doitChangerMotDePasse());
        ResponseCookie cookie = ResponseCookie.from(NOM_COOKIE_RAFRAICHISSEMENT, resultat.jetonRafraichissement())
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path(CHEMIN_COOKIE)
                .maxAge(java.time.Duration.ofDays(jwtProperties.getRefreshExpirationDays()))
                .build();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).body(corps);
    }

    private ResponseCookie cookieExpire() {
        return ResponseCookie.from(NOM_COOKIE_RAFRAICHISSEMENT, "")
                .httpOnly(true).secure(true).sameSite("Strict").path(CHEMIN_COOKIE).maxAge(0).build();
    }
}
