package cm.cositi.api.administration.dto;

import java.util.List;

/**
 * Rôle et ses permissions effectives (UC-SA-05).
 *
 * <p>En V1, les rôles sont **fermés** : les huit rôles de `Roles des acteurs.md §2` et aucun autre. Cet
 * écran les expose en lecture — créer un rôle reviendrait à inventer un acteur hors périmètre.</p>
 */
public record RoleDto(String code, String libelle, String description, List<String> permissions) {
}
