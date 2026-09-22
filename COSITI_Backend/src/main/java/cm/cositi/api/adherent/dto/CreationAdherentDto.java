package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** DTO d'entrée — jamais l'entité JPA exposée directement (docs/04_SECURITE.md §5). */
public record CreationAdherentDto(
        @NotBlank(message = "Le nom est obligatoire.") String nom,
        String prenoms,
        @Past(message = "La date de naissance doit être dans le passé.") LocalDate dateNaissance,
        String sexe,
        @NotBlank(message = "Le téléphone principal est obligatoire.") String telephonePrincipal,
        String telephoneSecondaire,
        String numeroCni,
        String numeroCnps,
        @NotNull(message = "L'activité est obligatoire.") UUID activiteId,
        @NotNull(message = "La zone est obligatoire.") UUID zoneId,
        UUID associationId,
        @NotBlank(message = "La localisation est obligatoire.") String localisation,
        String quartier,
        String ville,
        BigDecimal latitude,
        BigDecimal longitude,
        @NotNull(message = "La date d'adhésion est obligatoire.") LocalDate dateAdhesion,
        @NotNull(message = "Le pack est obligatoire.") UUID packId,
        boolean confirmationDoublonIgnore,
        boolean consentementDonnees
) {
}
