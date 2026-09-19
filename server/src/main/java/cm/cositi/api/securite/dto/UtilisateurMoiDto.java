package cm.cositi.api.securite.dto;

import java.util.List;
import java.util.UUID;

public record UtilisateurMoiDto(
    UUID id,
    String identifiant,
    String email,
    String nomComplet,
    String telephone,
    boolean mfaActive,
    boolean doitChangerMotDePasse,
    UUID agentId,
    List<String> roles,
    List<String> permissions
) {}
