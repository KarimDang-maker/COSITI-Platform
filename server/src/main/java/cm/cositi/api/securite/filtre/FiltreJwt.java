package cm.cositi.api.securite.filtre;

import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import cm.cositi.api.securite.service.ServiceJeton;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class FiltreJwt extends OncePerRequestFilter {

    private final ServiceJeton serviceJeton;
    private final UtilisateurRepository utilisateurRepository;

    public FiltreJwt(ServiceJeton serviceJeton, UtilisateurRepository utilisateurRepository) {
        this.serviceJeton = serviceJeton;
        this.utilisateurRepository = utilisateurRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        try {
            final String identifiant = serviceJeton.extraireIdentifiant(jwt);
            if (identifiant != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                Utilisateur utilisateur = utilisateurRepository.findByIdentifiant(identifiant).orElse(null);
                if (utilisateur != null && serviceJeton.estJetonValide(jwt, utilisateur)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            utilisateur,
                            null,
                            utilisateur.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Jeton invalide ou altéré : le contexte reste anonyme, géré par le point d'entrée d'authentification
        }

        filterChain.doFilter(request, response);
    }
}
