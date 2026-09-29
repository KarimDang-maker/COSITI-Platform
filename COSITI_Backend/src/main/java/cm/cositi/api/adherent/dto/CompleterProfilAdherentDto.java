package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.Past;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Complétion partielle d'un dossier adhérent (#16) : seuls les champs non nuls fournis sont appliqués.
 * Contrairement à {@link ModificationAdherentDto}, aucun champ n'est obligatoire ici — le but est de
 * renseigner progressivement les champs manquants identifiés par {@code GET /{id}/champs-manquants}.
 */
public record CompleterProfilAdherentDto(
        @Past(message = "La date de naissance doit être dans le passé.") LocalDate dateNaissance,
        String sexe,
        String telephoneSecondaire,
        String numeroCni,
        String numeroCnps,
        UUID associationId,
        String quartier,
        String ville,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean consentementDonnees
) {
}
