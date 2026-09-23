package cm.cositi.api.config;

import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaConfig {

    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> {
            Authentication authentification = SecurityContextHolder.getContext().getAuthentication();
            if (authentification == null || !authentification.isAuthenticated()) {
                return Optional.of("SYSTEME");
            }
            if (authentification.getPrincipal() instanceof Utilisateur utilisateur) {
                return Optional.of(utilisateur.getIdentifiant());
            }
            return Optional.ofNullable(authentification.getName()).or(() -> Optional.of("SYSTEME"));
        };
    }
}
