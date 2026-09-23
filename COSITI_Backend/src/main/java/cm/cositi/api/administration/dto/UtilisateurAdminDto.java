package cm.cositi.api.administration.dto;

import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Compte utilisateur vu par l'administration (jalon J11).
 *
 * <p>Ne contient <b>ni le hachage du mot de passe, ni le secret MFA, ni aucune donnée métier</b> : le
 * Super Administrateur administre des comptes, il n'a pas d'accès métier courant
 * (docs/04_SECURITE.md §3).</p>
 */
public record UtilisateurAdminDto(
        UUID id,
        String identifiant,
        String nomComplet,
        String email,
        String telephone,
        boolean actif,
        boolean doitChangerMotDePasse,
        boolean verrouille,
        Instant verrouilleJusquA,
        Instant derniereConnexionLe,
        List<String> roles,
        UUID agentId
) {
    public static UtilisateurAdminDto depuis(Utilisateur u) {
        return new UtilisateurAdminDto(u.getId(), u.getIdentifiant(), u.getNomComplet(), u.getEmail(),
                u.getTelephone(), u.isActif(), u.isDoitChangerMotDePasse(), u.estVerrouille(),
                u.getVerrouilleJusquA(), u.getDerniereConnexionLe(),
                u.getRoles().stream().map(Role::getCode).sorted().toList(), u.getAgentId());
    }
}
