package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO d'entrée — jamais l'entité JPA exposée directement (docs/04_SECURITE.md §5).
 *
 * <p>Plus de pack à la création (règles module 1 §7) : le pack et la répartition se choisissent à l'enregistrement
 * d'une cotisation ({@code EnregistrementPaiementDto.packId}). Un client qui enverrait encore {@code packId} n'est pas
 * rejeté : la propriété inconnue est ignorée.</p>
 */
public record CreationAdherentDto(
        @NotBlank(message = "Le nom est obligatoire.") String nom,
        String prenoms,
        @Past(message = "La date de naissance doit être dans le passé.") LocalDate dateNaissance,
        String sexe,
        @NotBlank(message = "Le téléphone principal est obligatoire.") String telephonePrincipal,
        String telephoneSecondaire,
        String whatsapp,
        @Email(message = "L'adresse e-mail n'est pas valide.") String email,
        String numeroCni,
        String numeroCnps,
        @NotNull(message = "L'activité est obligatoire.") UUID activiteId,
        /** Facultatif depuis V23 (formulaire allégé) ; conservé pour un appelant qui l'enverrait encore. */
        UUID zoneId,
        UUID associationId,
        /** Facultatif depuis V23 : quartier et ville restent saisis. */
        String localisation,
        String quartier,
        String ville,
        @NotNull(message = "La date d'adhésion est obligatoire.") LocalDate dateAdhesion,
        boolean confirmationDoublonIgnore,
        boolean consentementDonnees
) {
}
