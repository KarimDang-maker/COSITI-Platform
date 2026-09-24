package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Saisie préparatoire par l'Agent de terrain (correctif COSITI V1 §5) — jamais une création définitive :
 * aucun pack, aucune adhésion, aucune allocation. Seule la Gestionnaire des comptes complète ensuite le
 * dossier via {@code ServiceAdherent#finaliser}.
 */
public record PreinscriptionAdherentDto(
        @NotBlank(message = "Le nom est obligatoire.") String nom,
        String prenoms,
        @NotBlank(message = "Le téléphone principal est obligatoire.") String telephonePrincipal,
        String telephoneSecondaire,
        String numeroCni,
        @NotNull(message = "L'activité est obligatoire.") UUID activiteId,
        @NotNull(message = "La zone est obligatoire.") UUID zoneId,
        @NotBlank(message = "La localisation est obligatoire.") String localisation,
        String quartier,
        String ville,
        boolean confirmationDoublonIgnore
) {
}
