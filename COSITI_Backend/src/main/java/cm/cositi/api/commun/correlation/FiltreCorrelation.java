package cm.cositi.api.commun.correlation;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Identifiant de corrélation de bout en bout (document des règles v2.0, §42, §46 « Observabilité »). Reprend
 * {@code X-Correlation-Id} ou {@code X-Trace-Id} fourni par le client, en génère un sinon ; il est placé dans le MDC
 * (journaux), dans un attribut de requête (audit, réponses d'erreur) et renvoyé dans les deux en-têtes de réponse.
 * Placé avant la sécurité : même une requête refusée (401/403) porte son identifiant.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FiltreCorrelation extends OncePerRequestFilter {

    public static final String ATTRIBUT = "cositi.correlationId";
    public static final String CLE_MDC = "correlationId";
    public static final String ENTETE = "X-Correlation-Id";
    public static final String ENTETE_HISTORIQUE = "X-Trace-Id";

    /** Valeur fournie par le client acceptée seulement si elle est courte et sans caractère de contrôle. */
    private static final Pattern FORMAT = Pattern.compile("[A-Za-z0-9._:-]{8,80}");

    @Override
    protected void doFilterInternal(HttpServletRequest requete, HttpServletResponse reponse, FilterChain chaine)
            throws ServletException, IOException {
        String id = valide(requete.getHeader(ENTETE));
        if (id == null) {
            id = valide(requete.getHeader(ENTETE_HISTORIQUE));
        }
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        requete.setAttribute(ATTRIBUT, id);
        reponse.setHeader(ENTETE, id);
        reponse.setHeader(ENTETE_HISTORIQUE, id);
        MDC.put(CLE_MDC, id);
        try {
            chaine.doFilter(requete, reponse);
        } finally {
            MDC.remove(CLE_MDC);
        }
    }

    private static String valide(String valeur) {
        return valeur != null && FORMAT.matcher(valeur).matches() ? valeur : null;
    }

    /** Identifiant de la requête courante, ou {@code null} hors requête HTTP. */
    public static String courant(HttpServletRequest requete) {
        if (requete == null) {
            return MDC.get(CLE_MDC);
        }
        Object valeur = requete.getAttribute(ATTRIBUT);
        return valeur != null ? valeur.toString() : MDC.get(CLE_MDC);
    }
}
