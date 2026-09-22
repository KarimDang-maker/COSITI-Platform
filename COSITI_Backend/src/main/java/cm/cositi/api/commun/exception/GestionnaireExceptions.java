package cm.cositi.api.commun.exception;

import cm.cositi.api.commun.reponse.ReponseErreur;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.UUID;

/**
 * Traducteur unique des exceptions en réponse JSON normalisée.
 * Aucune trace technique, aucun nom de table, aucune requête SQL ne sort de l'API.
 */
@RestControllerAdvice
public class GestionnaireExceptions {

    private static final Logger LOG = LoggerFactory.getLogger(GestionnaireExceptions.class);

    @ExceptionHandler(ExceptionMetier.class)
    public ResponseEntity<ReponseErreur> gererMetier(ExceptionMetier ex, HttpServletRequest requete) {
        String traceId = traceId(requete);
        LOG.warn("Exception métier code={} statut={} traceId={}", ex.getCode(), ex.getStatut(), traceId);
        return ResponseEntity.status(ex.getStatut())
                .body(new ReponseErreur(ex.getStatut().value(), ex.getCode(), ex.getMessage(), ex.getChamp(), traceId));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ReponseErreur> gererValidation(MethodArgumentNotValidException ex, HttpServletRequest requete) {
        String champ = ex.getBindingResult().getFieldErrors().isEmpty() ? null
                : ex.getBindingResult().getFieldErrors().get(0).getField();
        String message = ex.getBindingResult().getFieldErrors().isEmpty() ? "Requête invalide."
                : ex.getBindingResult().getFieldErrors().get(0).getDefaultMessage();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ReponseErreur(400, "VALIDATION_ECHOUEE", message, champ, traceId(requete)));
    }

    @ExceptionHandler({AccessDeniedException.class})
    public ResponseEntity<ReponseErreur> gererAccesRefuse(AccessDeniedException ex, HttpServletRequest requete) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ReponseErreur(403, "ACCES_REFUSE", "Accès refusé.", null, traceId(requete)));
    }

    @ExceptionHandler({AuthenticationException.class, BadCredentialsException.class})
    public ResponseEntity<ReponseErreur> gererAuthentification(Exception ex, HttpServletRequest requete) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ReponseErreur(401, "AUTHENTIFICATION_REQUISE", "Authentification invalide ou expirée.", null, traceId(requete)));
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ReponseErreur> gererVerrouOptimiste(OptimisticLockingFailureException ex, HttpServletRequest requete) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ReponseErreur(409, "CONFLIT_CONCURRENCE", "La ressource a été modifiée entre-temps, veuillez recharger et réessayer.", null, traceId(requete)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ReponseErreur> gererInattendue(Exception ex, HttpServletRequest requete) {
        String traceId = traceId(requete);
        LOG.error("Erreur inattendue traceId={}", traceId, ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ReponseErreur(500, "ERREUR_INTERNE", "Une erreur inattendue est survenue.", null, traceId));
    }

    private String traceId(HttpServletRequest requete) {
        String entete = requete.getHeader("X-Trace-Id");
        return (entete != null && !entete.isBlank()) ? entete : UUID.randomUUID().toString();
    }
}
