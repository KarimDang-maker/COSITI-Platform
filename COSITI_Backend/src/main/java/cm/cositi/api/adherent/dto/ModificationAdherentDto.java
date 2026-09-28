package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ModificationAdherentDto(
        @NotBlank(message = "Le nom est obligatoire.") String nom,
        String prenoms,
        @Past(message = "La date de naissance doit être dans le passé.") LocalDate dateNaissance,
        String sexe,
        @NotBlank(message = "Le téléphone principal est obligatoire.") String telephonePrincipal,
        String telephoneSecondaire,
        String numeroCni,
        String numeroCnps,
        UUID activiteId,
        UUID associationId,
        String localisation,
        String quartier,
        String ville,
        BigDecimal latitude,
        BigDecimal longitude,
        Long version
) {
}
