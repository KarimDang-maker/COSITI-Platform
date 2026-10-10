package cm.cositi.api.audit;

import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Contexte commun ajouté aux valeurs « après » d'une ligne d'audit : rôles de l'acteur et identifiant de corrélation
 * ({@code X-Trace-Id}). {@code journal_audit} porte déjà l'acteur, la date, l'adresse et le motif.
 */
public final class ContexteAudit {

    private ContexteAudit() {
    }

    public static Map<String, Object> avec(Utilisateur acteur, Map<String, ?> details) {
        Map<String, Object> resultat = new LinkedHashMap<>();
        if (details != null) {
            resultat.putAll(details);
        }
        if (acteur != null) {
            resultat.put("acteurRoles", acteur.getRoles().stream().map(Role::getCode).sorted().toList());
        }
        resultat.put("correlationId", correlationId());
        return resultat;
    }

    public static String correlationId() {
        HttpServletRequest requete = RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributs
                ? attributs.getRequest() : null;
        return cm.cositi.api.commun.correlation.FiltreCorrelation.courant(requete);
    }

    /** Clé d'idempotence lue dans l'en-tête {@code Idempotency-Key}, à défaut d'une clé dans le corps. */
    public static String cleIdempotenceEntete() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributs) {
            String cle = attributs.getRequest().getHeader("Idempotency-Key");
            return cle == null || cle.isBlank() ? null : cle.trim();
        }
        return null;
    }
}
