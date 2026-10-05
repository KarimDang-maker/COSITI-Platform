package cm.cositi.api.cotisation.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Saisie d'une cotisation (règles module 2). {@code montantSecuriteSociale} + {@code montantEpargne} doivent égaler
 * {@code montant} ; s'ils sont absents, le serveur applique la règle par défaut et renvoie la répartition retenue
 * ({@code origineRepartition = PROPOSITION_SERVEUR}). {@code packId} est exigé à la première cotisation d'un adhérent
 * créé sans pack.
 */
public record EnregistrementPaiementDto(
        @NotNull(message = "L'adhérent est obligatoire.") UUID adherentId,
        @NotNull(message = "La date de paiement est obligatoire.") LocalDate datePaiement,
        @NotNull(message = "Le montant est obligatoire.")
        @DecimalMin(value = "0.01", message = "Le montant doit être strictement positif.") BigDecimal montant,
        @NotBlank(message = "Le mode de paiement est obligatoire.") String modePaiement,
        String referenceTransaction,
        @NotBlank(message = "Le type de paiement est obligatoire.") String typePaiement,
        UUID agentEncaisseurId,
        @DecimalMin(value = "0", message = "Le montant Sécurité sociale ne peut pas être négatif.")
        BigDecimal montantSecuriteSociale,
        @DecimalMin(value = "0", message = "Le montant Épargne ne peut pas être négatif.")
        BigDecimal montantEpargne,
        UUID packId
) {
    /** Forme antérieure à V22 (sans répartition ni pack), conservée pour les appelants existants. */
    public EnregistrementPaiementDto(UUID adherentId, LocalDate datePaiement, BigDecimal montant, String modePaiement,
                                     String referenceTransaction, String typePaiement, UUID agentEncaisseurId) {
        this(adherentId, datePaiement, montant, modePaiement, referenceTransaction, typePaiement, agentEncaisseurId,
                null, null, null);
    }
}
