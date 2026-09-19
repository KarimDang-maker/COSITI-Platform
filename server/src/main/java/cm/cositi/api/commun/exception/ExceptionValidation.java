package cm.cositi.api.commun.exception;

import java.util.Map;

public class ExceptionValidation extends ExceptionMetier {
    private final Map<String, String> erreursValidation;

    public ExceptionValidation(String message, Map<String, String> erreursValidation) {
        super("ERREUR_VALIDATION", message);
        this.erreursValidation = erreursValidation;
    }

    public Map<String, String> getErreursValidation() {
        return erreursValidation;
    }
}
