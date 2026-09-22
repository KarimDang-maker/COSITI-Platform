package cm.cositi.api.commun.exception;

import org.springframework.http.HttpStatus;

public class ExceptionValidation extends ExceptionMetier {
    public ExceptionValidation(String code, String message) {
        super(code, message, HttpStatus.BAD_REQUEST);
    }

    public ExceptionValidation(String code, String message, String champ) {
        super(code, message, HttpStatus.BAD_REQUEST, champ);
    }
}
