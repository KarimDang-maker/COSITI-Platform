package cm.cositi.api.securite.filtre;

import cm.cositi.api.securite.service.ServiceJeton;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/** Authentifie chaque requête à partir de l'en-tête {@code Authorization: Bearer <jwt>}. Sans état côté serveur. */
public class FiltreJwt extends OncePerRequestFilter {

    private static final String PREFIXE = "Bearer ";

    private final ServiceJeton serviceJeton;
    private final UserDetailsService serviceUtilisateurDetails;

    public FiltreJwt(ServiceJeton serviceJeton, UserDetailsService serviceUtilisateurDetails) {
        this.serviceJeton = serviceJeton;
        this.serviceUtilisateurDetails = serviceUtilisateurDetails;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest requete, HttpServletResponse reponse, FilterChain chaine)
            throws ServletException, IOException {
        String entete = requete.getHeader("Authorization");
        if (entete != null && entete.startsWith(PREFIXE) && SecurityContextHolder.getContext().getAuthentication() == null) {
            String jeton = entete.substring(PREFIXE.length());
            Optional<String> identifiant = serviceJeton.identifiantDepuisJetonAcces(jeton);
            if (identifiant.isPresent()) {
                try {
                    UserDetails utilisateur = serviceUtilisateurDetails.loadUserByUsername(identifiant.get());
                    if (utilisateur.isEnabled() && utilisateur.isAccountNonLocked()) {
                        var authentification = new UsernamePasswordAuthenticationToken(
                                utilisateur, null, utilisateur.getAuthorities());
                        authentification.setDetails(new WebAuthenticationDetailsSource().buildDetails(requete));
                        SecurityContextHolder.getContext().setAuthentication(authentification);
                    }
                } catch (Exception ignore) {
                    // Compte introuvable/désactivé : la requête reste anonyme, rejetée plus loin par la chaîne.
                }
            }
        }
        chaine.doFilter(requete, reponse);
    }
}
