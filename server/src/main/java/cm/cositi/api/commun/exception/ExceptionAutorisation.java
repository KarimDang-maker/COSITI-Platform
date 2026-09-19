package cm.cositi.api.commun.exception;

public class ExceptionAutorisation extends ExceptionMetier {
    public ExceptionAutorisation(String message) {
        super("ACCES_REFUSE", message);
    }
}
