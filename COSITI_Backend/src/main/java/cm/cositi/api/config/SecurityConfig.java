package cm.cositi.api.config;

import cm.cositi.api.commun.reponse.ReponseErreur;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.filtre.FiltreJwt;
import cm.cositi.api.securite.filtre.FiltreLimiteDebit;
import cm.cositi.api.securite.service.ServiceJeton;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Voir docs/04_SECURITE.md §3 et §6. Trois niveaux d'autorisation : route (ici), méthode (@PreAuthorize
 * sur les services), donnée (ServicePerimetreDonnees dans chaque service).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final ServiceJeton serviceJeton;
    private final UserDetailsService serviceUtilisateurDetails;
    private final ObjectMapper objectMapper;
    private final ServiceParametre serviceParametre;

    @Value("${cositi.securite.cors.allowed-origins:}")
    private String originesAutorisees;

    /**
     * Interrupteur de la limitation de débit. Vrai partout sauf dans la suite de tests d'intégration, qui
     * enchaîne des dizaines de connexions depuis la même adresse en quelques secondes et atteindrait la
     * limite pour une raison sans rapport avec ce qu'elle vérifie. Il n'est positionné que par
     * {@code ConfigurationTestsIntegration} ; aucun fichier de configuration d'exécution ne le définit, et
     * le profil de production ne le mentionne pas.
     */
    @Value("${cositi.securite.debit.actif:true}")
    private boolean limiteDebitActive;

    public SecurityConfig(ServiceJeton serviceJeton, UserDetailsService serviceUtilisateurDetails,
                           ObjectMapper objectMapper, ServiceParametre serviceParametre) {
        this.serviceJeton = serviceJeton;
        this.serviceUtilisateurDetails = serviceUtilisateurDetails;
        this.objectMapper = objectMapper;
        this.serviceParametre = serviceParametre;
    }

    @Bean
    public PasswordEncoder encodeurMotDePasse() {
        // BCrypt coût 12 — cf. AGENTS.md / docs/04_SECURITE.md §2 (Argon2id ou BCrypt >= 12).
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public DaoAuthenticationProvider fournisseurAuthentification() {
        DaoAuthenticationProvider fournisseur = new DaoAuthenticationProvider(encodeurMotDePasse());
        fournisseur.setUserDetailsService(serviceUtilisateurDetails);
        return fournisseur;
    }

    @Bean
    public SecurityFilterChain chaineFiltres(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // API sans état, authentifiée par en-tête Authorization uniquement.
            .cors(cors -> cors.configurationSource(sourceCors()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(fournisseurAuthentification())
            .headers(headers -> headers
                    .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'"))
                    .frameOptions(frame -> frame.deny())
                    .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                    .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
                    .contentTypeOptions(opts -> {})
            )
            .exceptionHandling(exceptions -> exceptions
                    .authenticationEntryPoint((requete, reponse, ex) ->
                            ecrireErreur(reponse, 401, "AUTHENTIFICATION_REQUISE", "Authentification requise."))
                    .accessDeniedHandler((requete, reponse, ex) ->
                            ecrireErreur(reponse, 403, "ACCES_REFUSE", "Accès refusé."))
            )
            .authorizeHttpRequests(autorisations -> autorisations
                    .requestMatchers(
                            "/api/v1/auth/connexion",
                            "/api/v1/auth/rafraichir",
                            "/actuator/health/**",
                            "/actuator/health",
                            "/v3/api-docs/**",
                            "/swagger-ui/**",
                            "/swagger-ui.html"
                    ).permitAll()
                    .anyRequest().authenticated()
            )
            .addFilterBefore(new FiltreJwt(serviceJeton, serviceUtilisateurDetails), UsernamePasswordAuthenticationFilter.class)
            // Placé APRÈS le filtre JWT : le compteur d'écritures et de lectures doit pouvoir s'appuyer sur
            // l'utilisateur authentifié. Seule la connexion, non authentifiée par définition, est comptée
            // par adresse d'appel (jalon J11, docs/03_SPECIFICATIONS_API.md §12).
            .addFilterAfter(filtreLimiteDebit(), FiltreJwt.class);

        return http.build();
    }

    /**
     * Seuils lus une fois au démarrage depuis la table {@code parametre} ({@code DEBIT_*}, V13), jamais
     * figés en constantes : ils s'ajustent sans redéploiement. Les relire à chaque requête ajouterait un
     * aller-retour en base sur le chemin critique de tous les appels.
     */
    private FiltreLimiteDebit filtreLimiteDebit() {
        return new FiltreLimiteDebit(objectMapper,
                serviceParametre.entier("DEBIT_CONNEXION_PAR_IP_15MIN"),
                serviceParametre.entier("DEBIT_ECRITURE_PAR_MINUTE"),
                serviceParametre.entier("DEBIT_LECTURE_PAR_MINUTE"),
                limiteDebitActive);
    }

    private void ecrireErreur(jakarta.servlet.http.HttpServletResponse reponse, int statut, String code, String message)
            throws java.io.IOException {
        reponse.setStatus(statut);
        reponse.setContentType(MediaType.APPLICATION_JSON_VALUE);
        reponse.setHeader("Cache-Control", "no-store");
        ReponseErreur corps = new ReponseErreur(statut, code, message, null, java.util.UUID.randomUUID().toString());
        reponse.getWriter().write(objectMapper.writeValueAsString(corps));
    }

    private CorsConfigurationSource sourceCors() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origines = originesAutorisees.isBlank() ? List.of() : List.of(originesAutorisees.split(","));
        configuration.setAllowedOrigins(origines);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key", "X-Trace-Id"));
        // Le frontend appelle toujours `fetch(..., { credentials: "include" })` pour transporter le cookie
        // HttpOnly de rafraîchissement (`auth/jeton.ts`, `api/client.ts`). Sans `allowCredentials=true`, le
        // navigateur bloque la lecture de toute réponse cross-origin (y compris `/auth/connexion`), même si la
        // requête aboutit côté serveur — c'est sûr uniquement parce que `originesAutorisees` reste une liste
        // blanche explicite, jamais `*` (docs/04_SECURITE.md §6).
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
