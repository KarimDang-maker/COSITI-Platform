package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

/** Entrée de {@code PUT /adherents/{id}/coordonnees} (#32). */
public record ModifierCoordonneesDto(
        @NotBlank(message = "Le téléphone principal est obligatoire.") String telephonePrincipal,
        String telephoneSecondaire,
        String numeroCni,
        @NotBlank(message = "La localisation est obligatoire.") String localisation,
        String quartier,
        String ville,
        BigDecimal latitude,
        BigDecimal longitude
) {
}
