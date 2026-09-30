package cm.cositi.api.commun.exception;

import org.springframework.http.HttpStatus;

public class ExceptionRessourceIntrouvable extends ExceptionMetier {
    public ExceptionRessourceIntrouvable(String message) {
        super("RESSOURCE_INTROUVABLE", message, HttpStatus.NOT_FOUND);
    }

    public ExceptionRessourceIntrouvable(String code, String message) {
        super(code, message, HttpStatus.NOT_FOUND);
    }
}
