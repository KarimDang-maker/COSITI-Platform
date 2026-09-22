package cm.cositi.api.commun.exception;

import org.springframework.http.HttpStatus;

/** Racine des exceptions métier de la plateforme. Le message est destiné à l'utilisateur final, en français. */
public class ExceptionMetier extends RuntimeException {

    private final String code;
    private final HttpStatus statut;
    private final String champ;

    public ExceptionMetier(String code, String message, HttpStatus statut) {
        this(code, message, statut, null);
    }

    public ExceptionMetier(String code, String message, HttpStatus statut, String champ) {
        super(message);
        this.code = code;
        this.statut = statut;
        this.champ = champ;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatut() {
        return statut;
    }

    public String getChamp() {
        return champ;
    }
}
