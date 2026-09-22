package cm.cositi.api.securite.dto;

import java.util.List;
import java.util.UUID;

public record ProfilDto(
        UUID id,
        String identifiant,
        String nomComplet,
        List<String> roles,
        List<String> permissions
) {
}
