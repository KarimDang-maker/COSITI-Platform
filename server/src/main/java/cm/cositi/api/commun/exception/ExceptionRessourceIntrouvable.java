package cm.cositi.api.commun.exception;

public class ExceptionRessourceIntrouvable extends ExceptionMetier {
    public ExceptionRessourceIntrouvable(String message) {
        super("RESSOURCE_INTROUVABLE", message);
    }

    public ExceptionRessourceIntrouvable(String ressource, Object identifiant) {
        super("RESSOURCE_INTROUVABLE", String.format("%s avec l'identifiant %s introuvable.", ressource, identifiant));
    }
}
