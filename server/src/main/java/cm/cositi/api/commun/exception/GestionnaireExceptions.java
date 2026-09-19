package cm.cositi.api.commun.exception;

import cm.cositi.api.commun.reponse.ReponseErreur;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GestionnaireExceptions {

    private static final Logger log = LoggerFactory.getLogger(GestionnaireExceptions.class);

    @ExceptionHandler(ExceptionRessourceIntrouvable.class)
    public ResponseEntity<ReponseErreur> gererRessourceIntrouvable(ExceptionRessourceIntrouvable ex, HttpServletRequest request) {
        String traceId = genererTraceId();
        ReponseErreur reponse = new ReponseErreur(HttpStatus.NOT_FOUND.value(), ex.getCode(), ex.getMessage(), traceId);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(reponse);
    }

    @ExceptionHandler(ExceptionAutorisation.class)
    public ResponseEntity<ReponseErreur> gererAutorisation(ExceptionAutorisation ex, HttpServletRequest request) {
        String traceId = genererTraceId();
        log.warn("Tentative d'accès non autorisé [Trace: {}] : {}", traceId, ex.getMessage());
        ReponseErreur reponse = new ReponseErreur(HttpStatus.FORBIDDEN.value(), ex.getCode(), ex.getMessage(), traceId);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(reponse);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ReponseErreur> gererAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        String traceId = genererTraceId();
        log.warn("Permission insuffisante [Trace: {}] : {}", traceId, ex.getMessage());
        ReponseErreur reponse = new ReponseErreur(HttpStatus.FORBIDDEN.value(), "ACCES_REFUSE", "Vous ne disposez pas des autorisations nécessaires pour cette opération.", traceId);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(reponse);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ReponseErreur> gererBadCredentials(BadCredentialsException ex) {
        String traceId = genererTraceId();
        ReponseErreur reponse = new ReponseErreur(HttpStatus.UNAUTHORIZED.value(), "AUTHENTIFICATION_ECHOUEE", "Identifiant ou mot de passe incorrect.", traceId);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(reponse);
    }

    @ExceptionHandler(ExceptionConflit.class)
    public ResponseEntity<ReponseErreur> gererConflit(ExceptionConflit ex) {
        String traceId = genererTraceId();
        ReponseErreur reponse = new ReponseErreur(HttpStatus.CONFLICT.value(), ex.getCode(), ex.getMessage(), traceId);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(reponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ReponseErreur> gererValidation(MethodArgumentNotValidException ex) {
        String traceId = genererTraceId();
        Map<String, String> erreurs = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            erreurs.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        ReponseErreur reponse = new ReponseErreur(HttpStatus.BAD_REQUEST.value(), "ERREUR_VALIDATION", "Les données soumises contiennent des erreurs de format.", traceId);
        reponse.setDetails(erreurs);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(reponse);
    }

    @ExceptionHandler(ExceptionMetier.class)
    public ResponseEntity<ReponseErreur> gererExceptionMetier(ExceptionMetier ex) {
        String traceId = genererTraceId();
        ReponseErreur reponse = new ReponseErreur(HttpStatus.BAD_REQUEST.value(), ex.getCode(), ex.getMessage(), traceId);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(reponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ReponseErreur> gererErreurInattendue(Exception ex) {
        String traceId = genererTraceId();
        log.error("Erreur serveur inattendue [Trace: {}]", traceId, ex);
        ReponseErreur reponse = new ReponseErreur(HttpStatus.INTERNAL_SERVER_ERROR.value(), "ERREUR_INTERNE", "Une erreur inattendue est survenue. Veuillez contacter le support en indiquant l'identifiant de trace.", traceId);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(reponse);
    }

    private String genererTraceId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
