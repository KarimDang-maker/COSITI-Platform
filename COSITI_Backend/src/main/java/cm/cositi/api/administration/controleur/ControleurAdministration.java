package cm.cositi.api.administration.controleur;

import cm.cositi.api.administration.dto.ChangementActivationDto;
import cm.cositi.api.administration.dto.ChangementRolesDto;
import cm.cositi.api.administration.dto.CreationUtilisateurDto;
import cm.cositi.api.administration.dto.ModificationParametreDto;
import cm.cositi.api.administration.dto.ModificationUtilisateurDto;
import cm.cositi.api.administration.dto.ParametreDto;
import cm.cositi.api.administration.dto.RoleDto;
import cm.cositi.api.administration.dto.UtilisateurAdminDto;
import cm.cositi.api.administration.service.ServiceAdministration;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * docs/03_SPECIFICATIONS_API.md §10 — Administration (jalon J11).
 *
 * <p>Aucune route de <b>suppression</b> : un compte se désactive, il ne s'efface pas (AGENTS.md règle
 * absolue n°3). Aucune route de <b>création de rôle</b> non plus : les huit rôles de la V1 sont fermés
 * (Roles des acteurs.md §16), et en ajouter un reviendrait à inventer un acteur hors périmètre.</p>
 */
@RestController
@RequestMapping("/api/v1/administration")
public class ControleurAdministration {

    private final ServiceAdministration serviceAdministration;

    public ControleurAdministration(ServiceAdministration serviceAdministration) {
        this.serviceAdministration = serviceAdministration;
    }

    // ------------------------------------------------------------------ Comptes

    @GetMapping("/utilisateurs")
    public ReponsePaginee<UtilisateurAdminDto> listerUtilisateurs(
            @RequestParam(required = false) String recherche,
            @RequestParam(required = false) Boolean actif,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille) {
        return serviceAdministration.listerUtilisateurs(recherche, actif,
                PageRequest.of(page, Math.min(taille, 200), Sort.by("identifiant")));
    }

    @GetMapping("/utilisateurs/{id}")
    public UtilisateurAdminDto consulter(@PathVariable UUID id) {
        return serviceAdministration.consulterUtilisateur(id);
    }

    /**
     * Le mot de passe initial est renvoyé <b>une seule fois</b>, dans cette réponse et nulle part ailleurs :
     * il n'est ni stocké en clair, ni journalisé, ni relisible ensuite (même principe qu'à l'ajout d'un
     * agent par la DGA, jalon J3).
     */
    @PostMapping("/utilisateurs")
    public ResponseEntity<Map<String, Object>> creer(@Valid @RequestBody CreationUtilisateurDto dto,
                                                      @AuthenticationPrincipal Utilisateur auteur) {
        ServiceAdministration.CompteCree cree = serviceAdministration.creerUtilisateur(dto, auteur);
        return ResponseEntity.status(201).body(Map.of(
                "utilisateur", cree.utilisateur(),
                "motDePasseInitial", cree.motDePasseInitial()));
    }

    @PutMapping("/utilisateurs/{id}")
    public UtilisateurAdminDto modifier(@PathVariable UUID id,
                                         @Valid @RequestBody ModificationUtilisateurDto dto,
                                         @AuthenticationPrincipal Utilisateur auteur) {
        return serviceAdministration.modifierUtilisateur(id, dto, auteur);
    }

    @PostMapping("/utilisateurs/{id}/activation")
    public UtilisateurAdminDto changerActivation(@PathVariable UUID id,
                                                  @Valid @RequestBody ChangementActivationDto dto,
                                                  @AuthenticationPrincipal Utilisateur auteur) {
        return serviceAdministration.changerActivation(id, dto, auteur);
    }

    @PostMapping("/utilisateurs/{id}/roles")
    public UtilisateurAdminDto changerRoles(@PathVariable UUID id,
                                             @Valid @RequestBody ChangementRolesDto dto,
                                             @AuthenticationPrincipal Utilisateur auteur) {
        return serviceAdministration.changerRoles(id, dto, auteur);
    }

    @PostMapping("/utilisateurs/{id}/mot-de-passe/reinitialiser")
    public Map<String, String> reinitialiserMotDePasse(@PathVariable UUID id,
                                                        @AuthenticationPrincipal Utilisateur auteur) {
        return Map.of("motDePasseInitial", serviceAdministration.reinitialiserMotDePasse(id, auteur));
    }

    // ------------------------------------------------------------------ Rôles

    @GetMapping("/roles")
    public List<RoleDto> listerRoles() {
        return serviceAdministration.listerRoles();
    }

    // ------------------------------------------------------------------ Paramètres

    @GetMapping("/parametres")
    public List<ParametreDto> listerParametres() {
        return serviceAdministration.listerParametres();
    }

    @PutMapping("/parametres/{cle}")
    public ParametreDto modifierParametre(@PathVariable String cle,
                                           @Valid @RequestBody ModificationParametreDto dto,
                                           @AuthenticationPrincipal Utilisateur auteur) {
        return serviceAdministration.modifierParametre(cle, dto, auteur);
    }
}
