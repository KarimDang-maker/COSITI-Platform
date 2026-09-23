package cm.cositi.api.commun.exception;

import cm.cositi.api.commun.reponse.ReponseErreur;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

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

    /**
     * Corps de requête illisible : JSON malformé, ou valeur qui ne correspond à aucune constante d'une
     * énumération (par exemple un {@code typePiece} inventé).
     *
     * <p>Sans ce gestionnaire, ces cas remontaient jusqu'au filet {@code Exception} et renvoyaient
     * <b>500</b> — défaut présent depuis J1 sur tous les endpoints à corps JSON, trouvé au jalon J7 en
     * testant un type de pièce inexistant. Un 500 dit au client « réessaie plus tard » alors que sa requête
     * ne passera jamais, et pollue la supervision avec de fausses erreurs serveur.</p>
     *
     * <p>Le message de l'exception n'est <b>jamais</b> renvoyé tel quel : Jackson y expose les noms de
     * classes et de paquetages Java (docs/04_SECURITE.md — aucune trace technique ne sort de l'API). Seul le
     * nom du champ fautif est extrait, quand Jackson le connaît.</p>
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ReponseErreur> gererCorpsIllisible(HttpMessageNotReadableException ex,
                                                              HttpServletRequest requete) {
        String traceId = traceId(requete);
        LOG.warn("Corps de requête illisible traceId={}", traceId);

        String champ = null;
        String message = "Le corps de la requête est illisible ou mal formé.";
        if (ex.getCause() instanceof InvalidFormatException format) {
            champ = format.getPath().isEmpty() ? null
                    : format.getPath().get(format.getPath().size() - 1).getFieldName();
            if (format.getTargetType() != null && format.getTargetType().isEnum()) {
                message = "Valeur non autorisée pour le champ « " + (champ == null ? "?" : champ)
                        + " ». Valeurs possibles : "
                        + String.join(", ", java.util.Arrays.stream(format.getTargetType().getEnumConstants())
                        .map(String::valueOf).toList()) + ".";
            } else {
                message = "Format invalide pour le champ « " + (champ == null ? "?" : champ) + " ».";
            }
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ReponseErreur(400, "CORPS_REQUETE_INVALIDE", message, champ, traceId));
    }

    /** Paramètre de requête au mauvais type (un UUID attendu, un texte reçu). Même motif que ci-dessus. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ReponseErreur> gererParametreInvalide(MethodArgumentTypeMismatchException ex,
                                                                 HttpServletRequest requete) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ReponseErreur(400, "PARAMETRE_INVALIDE",
                        "Le paramètre « " + ex.getName() + " » n'a pas un format valide.", ex.getName(),
                        traceId(requete)));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ReponseErreur> gererParametreManquant(MissingServletRequestParameterException ex,
                                                                 HttpServletRequest requete) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ReponseErreur(400, "PARAMETRE_REQUIS",
                        "Le paramètre « " + ex.getParameterName() + " » est obligatoire.", ex.getParameterName(),
                        traceId(requete)));
    }

    /**
     * Méthode HTTP non exposée sur ce chemin — par exemple un {@code DELETE} sur un compte, qui n'existe
     * pas (aucune suppression physique, AGENTS.md règle n°3).
     *
     * <p>Sans ce gestionnaire, le cas remontait au filet générique et renvoyait <b>500</b> : le serveur
     * s'accusait d'une panne là où le client demandait simplement une opération inexistante. Même classe
     * de défaut que les corps de requête illisibles, corrigée au jalon J7.</p>
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ReponseErreur> gererMethodeNonSupportee(HttpRequestMethodNotSupportedException ex,
                                                                   HttpServletRequest requete) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(new ReponseErreur(405, "METHODE_NON_AUTORISEE",
                        "Cette opération n'existe pas sur cette ressource.", null, traceId(requete)));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ReponseErreur> gererTypeMediaNonSupporte(HttpMediaTypeNotSupportedException ex,
                                                                    HttpServletRequest requete) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(new ReponseErreur(415, "TYPE_MEDIA_NON_SUPPORTE",
                        "Le format de la requête n'est pas accepté par cet endpoint.", null, traceId(requete)));
    }

    /**
     * Fichier au-delà de {@code spring.servlet.multipart.max-file-size} : rejeté par le transport avant même
     * d'atteindre le service, qui applique par ailleurs sa propre limite métier (jalon J7).
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ReponseErreur> gererFichierTropVolumineux(MaxUploadSizeExceededException ex,
                                                                     HttpServletRequest requete) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ReponseErreur(413, "DOCUMENT_TROP_VOLUMINEUX",
                        "Le fichier dépasse la taille maximale autorisée.", "fichier", traceId(requete)));
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ReponseErreur> gererVerrouOptimiste(OptimisticLockingFailureException ex, HttpServletRequest requete) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ReponseErreur(409, "CONFLIT_CONCURRENCE", "La ressource a été modifiée entre-temps, veuillez recharger et réessayer.", null, traceId(requete)));
    }

    /**
     * Violation d'une contrainte d'intégrité (unicité, clé étrangère) parvenue jusqu'à la base.
     *
     * <p>Un conflit de données n'est pas une panne du serveur : le renvoyer en 500 faisait dire à
     * l'API qu'elle était en échec là où la demande était simplement en conflit, et le client
     * n'avait aucun moyen de faire la différence. Constaté au jalon J12 en recette E2E, sur la
     * création d'un second adhérent sans numéro CNI.</p>
     *
     * <p>Les services valident en amont ce qu'ils peuvent (doublons, pack actif…) ; ce
     * gestionnaire est le filet pour ce qui ne peut être garanti qu'en base, notamment une course
     * entre deux écritures concurrentes. <b>Le message de la base n'est jamais renvoyé</b> : il
     * nommerait les tables et les index (`docs/04_SECURITE.md §6`). Il reste journalisé avec le
     * {@code traceId}, côté serveur uniquement.</p>
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ReponseErreur> gererIntegrite(DataIntegrityViolationException ex, HttpServletRequest requete) {
        String traceId = traceId(requete);
        LOG.warn("Violation d'intégrité traceId={}", traceId, ex);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ReponseErreur(409, "CONFLIT_INTEGRITE",
                        "Cette opération entre en conflit avec une donnée existante.", null, traceId));
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
