package cm.cositi.api.commun.exception;

public class ExceptionMetier extends RuntimeException {
    private final String code;

    public ExceptionMetier(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
