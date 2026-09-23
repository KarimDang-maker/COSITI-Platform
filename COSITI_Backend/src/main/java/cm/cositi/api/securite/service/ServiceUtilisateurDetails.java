package cm.cositi.api.securite.service;

import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServiceUtilisateurDetails implements UserDetailsService {

    private final UtilisateurRepository repository;

    public ServiceUtilisateurDetails(UtilisateurRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifiant) {
        Utilisateur utilisateur = repository.findByIdentifiant(identifiant)
                .orElseThrow(() -> new UsernameNotFoundException("Identifiants invalides."));
        // Forcer le chargement des rôles/permissions avant la fermeture du contexte de persistance
        // (spring.jpa.open-in-view=false) : nécessaire pour getAuthorities() plus tard dans la requête.
        utilisateur.getRoles().forEach(r -> r.getPermissions().size());
        return utilisateur;
    }
}
