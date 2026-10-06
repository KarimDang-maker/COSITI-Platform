package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record VerifierDoublonDto(
        String telephonePrincipal,
        String numeroCni,
        String nomComplet,
        /** Facultative depuis V23 : sans zone, la similarité de nom se cherche sur tous les adhérents. */
        UUID zoneId
) {
}
