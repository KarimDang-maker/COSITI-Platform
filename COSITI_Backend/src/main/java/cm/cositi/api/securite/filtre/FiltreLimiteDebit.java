package cm.cositi.api.securite.filtre;

import cm.cositi.api.commun.reponse.ReponseErreur;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Limitation de débit (docs/03_SPECIFICATIONS_API.md §12, jalon J11).
 *
 * <p>Trois seuils distincts, parce que les risques le sont : les tentatives de connexion visent les
 * comptes, les écritures visent les données, les lectures visent surtout la disponibilité. Un dépassement
 * renvoie {@code 429} avec un en-tête {@code Retry-After} — que le client sait déjà lire
 * ({@code api/client.ts}, jalon J1).</p>
 *
 * <p><b>La connexion se compte par tranche de 15 minutes et par adresse</b>, pas par minute. Les deux
 * règles de {@code §12} sont complémentaires : « 5 tentatives / 15 min / identifiant » est déjà appliquée
 * par le verrouillage de compte exponentiel (jalon J1) et protège <i>un</i> compte ; « 20 / 15 min / IP »
 * relève de ce filtre et freine le balayage de <i>plusieurs</i> comptes. Les confondre en « 5 par minute
 * et par IP » bloquerait un bureau COSITI dont tous les postes partagent une même connexion, ce qui est
 * le cas courant.</p>
 *
 * <p><b>Limite connue et assumée : compteurs en mémoire de l'instance.</b> Avec plusieurs instances
 * derrière un répartiteur, chacune applique son propre quota, et la limite effective est multipliée par
 * leur nombre. C'est suffisant pour ralentir une attaque par force brute sur un déploiement mono-instance,
 * ce qu'est la V1 ; un compteur partagé (Redis) ou une limitation en amont (passerelle, WAF) est à prévoir
 * avant une mise à l'échelle — consigné dans {@code Conception/SUIVI_EXECUTION.md}.</p>
 *
 * <p>Les seuils vivent dans la table {@code parametre} ({@code DEBIT_*}, V13) et non en constantes : ils
 * s'ajustent sans redéploiement une fois le trafic réel observé. Ils sont lus une fois au démarrage du
 * filtre pour ne pas requêter la base à chaque appel HTTP.</p>
 */
public class FiltreLimiteDebit extends OncePerRequestFilter {

    private static final Logger JOURNAL = LoggerFactory.getLogger(FiltreLimiteDebit.class);

    /** Fenêtre glissante simplifiée : un compteur par minute civile, remis à zéro au changement de minute. */
    private record Compteur(AtomicInteger nombre, Instant debutFenetre) {
    }

    /** Fenêtre de comptage de la connexion, distincte de celle des lectures et écritures. */
    private static final int MINUTES_FENETRE_CONNEXION = 15;

    private final ObjectMapper objectMapper;
    private final int limiteConnexion;
    private final int limiteEcriture;
    private final int limiteLecture;
    private final boolean actif;

    private final Map<String, Compteur> compteurs = new ConcurrentHashMap<>();

    public FiltreLimiteDebit(ObjectMapper objectMapper, int limiteConnexion, int limiteEcriture,
                              int limiteLecture, boolean actif) {
        this.objectMapper = objectMapper;
        this.limiteConnexion = limiteConnexion;
        this.limiteEcriture = limiteEcriture;
        this.limiteLecture = limiteLecture;
        this.actif = actif;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest requete, HttpServletResponse reponse, FilterChain chaine)
            throws ServletException, IOException {

        if (!actif) {
            chaine.doFilter(requete, reponse);
            return;
        }

        String chemin = requete.getRequestURI();
        String methode = requete.getMethod();

        int limite;
        int minutesFenetre;
        String categorie;
        if (chemin.endsWith("/auth/connexion")) {
            limite = limiteConnexion;
            minutesFenetre = MINUTES_FENETRE_CONNEXION;
            categorie = "connexion";
        } else if ("POST".equals(methode) || "PUT".equals(methode) || "PATCH".equals(methode)
                || "DELETE".equals(methode)) {
            limite = limiteEcriture;
            minutesFenetre = 1;
            categorie = "ecriture";
        } else {
            limite = limiteLecture;
            minutesFenetre = 1;
            categorie = "lecture";
        }

        String cle = categorie + ":" + identifiantAppelant(requete);
        if (depasse(cle, limite, minutesFenetre)) {
            // Journalisé sans donnée personnelle : la clé contient un identifiant ou une IP, pas de contenu.
            JOURNAL.warn("Limite de débit atteinte pour la catégorie {} ({} appels par {} minute(s))",
                    categorie, limite, minutesFenetre);
            refuser(reponse, minutesFenetre);
            return;
        }

        chaine.doFilter(requete, reponse);
    }

    /**
     * L'utilisateur authentifié quand il l'est, l'adresse d'appel sinon. La connexion n'étant pas
     * authentifiée par définition, elle est toujours comptée par adresse.
     */
    private static String identifiantAppelant(HttpServletRequest requete) {
        var authentification = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication();
        if (authentification != null && authentification.isAuthenticated()
                && !"anonymousUser".equals(authentification.getName())) {
            return authentification.getName();
        }
        String transmise = requete.getHeader("X-Forwarded-For");
        if (transmise != null && !transmise.isBlank()) {
            // Première adresse de la chaîne : celle du client réel derrière le répartiteur.
            return transmise.split(",")[0].trim();
        }
        return requete.getRemoteAddr();
    }

    private boolean depasse(String cle, int limite, int minutesFenetre) {
        Instant debutFenetre = debutFenetre(minutesFenetre);

        Compteur compteur = compteurs.compute(cle, (ignore, existant) -> {
            if (existant == null || existant.debutFenetre().isBefore(debutFenetre)) {
                return new Compteur(new AtomicInteger(0), debutFenetre);
            }
            return existant;
        });

        return compteur.nombre().incrementAndGet() > limite;
    }

    /** Début de la tranche courante : fenêtres fixes alignées sur l'horloge, pas glissantes. */
    private static Instant debutFenetre(int minutesFenetre) {
        Instant minute = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
        long minutesDepuisEpoque = minute.getEpochSecond() / 60;
        return Instant.ofEpochSecond((minutesDepuisEpoque - (minutesDepuisEpoque % minutesFenetre)) * 60);
    }

    private void refuser(HttpServletResponse reponse, int minutesFenetre) throws IOException {
        reponse.setStatus(429);
        reponse.setContentType(MediaType.APPLICATION_JSON_VALUE);
        reponse.setHeader("Retry-After", String.valueOf(secondesAvantProchaineFenetre(minutesFenetre)));
        reponse.setHeader("Cache-Control", "no-store");

        ReponseErreur corps = new ReponseErreur(429, "LIMITE_DEBIT_ATTEINTE",
                "Trop de requêtes. Réessayez dans quelques instants.", null, UUID.randomUUID().toString());
        reponse.getWriter().write(objectMapper.writeValueAsString(corps));
    }

    private static long secondesAvantProchaineFenetre(int minutesFenetre) {
        Instant maintenant = Instant.now();
        Instant prochaine = debutFenetre(minutesFenetre).plus(Duration.ofMinutes(minutesFenetre));
        return Math.max(1, Duration.between(maintenant, prochaine).toSeconds());
    }
}
