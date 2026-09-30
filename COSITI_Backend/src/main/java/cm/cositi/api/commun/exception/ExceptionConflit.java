package cm.cositi.api.commun.exception;

import org.springframework.http.HttpStatus;

/** Doublon, verrou optimiste, transition d'état interdite. */
public class ExceptionConflit extends ExceptionMetier {
    public ExceptionConflit(String code, String message) {
        super(code, message, HttpStatus.CONFLICT);
    }

    public ExceptionConflit(String code, String message, String champ) {
        super(code, message, HttpStatus.CONFLICT, champ);
    }
}
