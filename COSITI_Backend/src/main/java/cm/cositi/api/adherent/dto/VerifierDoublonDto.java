package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record VerifierDoublonDto(
        String telephonePrincipal,
        String numeroCni,
        String nomComplet,
        @NotNull(message = "La zone est obligatoire pour la recherche de similarité.") UUID zoneId
) {
}
