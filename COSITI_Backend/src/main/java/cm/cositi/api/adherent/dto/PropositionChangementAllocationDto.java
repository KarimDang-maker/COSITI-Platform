package cm.cositi.api.adherent.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Proposition de la Gestionnaire (RAPORT_V1.md §6.3/§7.2) — ne modifie rien tant que le DAF n'a pas validé.
 * {@code packId} facultatif : un changement d'allocation seule, sans changement de pack, reste possible.
 */
public record PropositionChangementAllocationDto(
        UUID packId,
        @NotNull(message = "Le montant de référence est obligatoire.") BigDecimal montantReference,
        BigDecimal allocationSecuriteSociale,
        BigDecimal allocationEpargne
) {
}
