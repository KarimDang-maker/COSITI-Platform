package cm.cositi.api.adhesion.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Enregistrement du frais d'adhésion collecté sur le terrain. Le montant attendu n'est jamais transmis : il vient du
 * paramètre {@code MONTANT_INSCRIPTION}. {@code montantRecu} (facultatif, défaut = montant attendu) est ce que l'agent
 * a effectivement remis ; un écart est enregistré tel quel et signalé.
 */
public record EnregistrerFraisAdhesionDto(
        @NotNull(message = "L'agent collecteur est obligatoire.") UUID agentId,
        @DecimalMin(value = "0.01", message = "Le montant reçu doit être strictement positif.") BigDecimal montantRecu,
        @PastOrPresent(message = "La date de collecte ne peut pas être dans le futur.") LocalDate dateCollecte,
        @Size(max = 1000, message = "Le commentaire ne peut pas dépasser 1000 caractères.") String commentaire,
        @Size(max = 80, message = "La clé d'idempotence ne peut pas dépasser 80 caractères.") String cleIdempotence
) {
}
