package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Complète un adhérent {@code PREINSCRIT} (saisi par un Agent, §5) en dossier définitif — réservée à la
 * Gestionnaire des comptes ({@code ADHERENT:CREER}). Ouvre l'adhésion (pack) et, si fourni, enregistre la
 * préférence d'allocation Sécurité Sociale/Épargne (§8) : {@code allocationSecuriteSociale}/
 * {@code allocationEpargne} sont facultatifs — à défaut, la répartition par défaut (700 FCFA plancher puis
 * Épargne) s'applique.
 */
public record FinalisationAdherentDto(
        @NotNull(message = "La date d'adhésion est obligatoire.") LocalDate dateAdhesion,
        @NotNull(message = "Le pack est obligatoire.") UUID packId,
        @NotNull(message = "Le montant de référence est obligatoire.") BigDecimal montantReference,
        BigDecimal allocationSecuriteSociale,
        BigDecimal allocationEpargne,
        boolean consentementDonnees
) {
}
