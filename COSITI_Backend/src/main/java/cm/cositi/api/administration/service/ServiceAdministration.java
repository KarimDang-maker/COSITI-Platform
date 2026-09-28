package cm.cositi.api.administration.service;

import cm.cositi.api.administration.dto.ChangementActivationDto;
import cm.cositi.api.administration.dto.ChangementRolesDto;
import cm.cositi.api.administration.dto.CreationUtilisateurDto;
import cm.cositi.api.administration.dto.ModificationParametreDto;
import cm.cositi.api.administration.dto.ModificationUtilisateurDto;
import cm.cositi.api.administration.dto.ParametreDto;
import cm.cositi.api.administration.dto.RoleDto;
import cm.cositi.api.administration.dto.UtilisateurAdminDto;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * Administration des comptes, rôles et paramètres (Roles des acteurs.md §10, jalon J11).
 *
 * <p>La permission {@code ADMINISTRATION:GERER} existe depuis V5 mais n'était référencée nulle part dans
 * le code : ce service lui donne enfin des endpoints.</p>
 */
public interface ServiceAdministration {

    /** Compte créé avec un mot de passe aléatoire, révélé une seule fois dans la réponse. */
    record CompteCree(UtilisateurAdminDto utilisateur, String motDePasseInitial) {
    }

    ReponsePaginee<UtilisateurAdminDto> listerUtilisateurs(String recherche, Boolean actif, Pageable pageable);

    UtilisateurAdminDto consulterUtilisateur(UUID utilisateurId);

    CompteCree creerUtilisateur(CreationUtilisateurDto dto, Utilisateur auteur);

    UtilisateurAdminDto modifierUtilisateur(UUID utilisateurId, ModificationUtilisateurDto dto, Utilisateur auteur);

    UtilisateurAdminDto changerActivation(UUID utilisateurId, ChangementActivationDto dto, Utilisateur auteur);

    UtilisateurAdminDto changerRoles(UUID utilisateurId, ChangementRolesDto dto, Utilisateur auteur);

    /** Réinitialise le mot de passe et renvoie le nouveau, révélé une seule fois. */
    String reinitialiserMotDePasse(UUID utilisateurId, Utilisateur auteur);

    /** Les huit rôles V1 sont fermés : cette méthode les expose, aucune n'en crée. */
    List<RoleDto> listerRoles();

    List<ParametreDto> listerParametres();

    ParametreDto modifierParametre(String cle, ModificationParametreDto dto, Utilisateur auteur);
}
