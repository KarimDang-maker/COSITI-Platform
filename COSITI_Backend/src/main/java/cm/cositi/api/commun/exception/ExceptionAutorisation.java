package cm.cositi.api.commun.exception;

import org.springframework.http.HttpStatus;

/** Refus RBAC, périmètre de données étranger, ou violation de la séparation saisie/validation. */
public class ExceptionAutorisation extends ExceptionMetier {
    public ExceptionAutorisation(String message) {
        super("ACCES_REFUSE", message, HttpStatus.FORBIDDEN);
    }

    public ExceptionAutorisation(String code, String message) {
        super(code, message, HttpStatus.FORBIDDEN);
    }
}
