package cm.cositi.api.cotisation.dto;

import cm.cositi.api.audit.TypeOperation;

import java.time.Instant;

/**
 * Une étape de la chronologie d'un paiement (#18), reconstruite depuis le journal d'audit append-only : chaque
 * transition y est tracée dans la même transaction que la mutation, aucune table parallèle à tenir à jour.
 */
public record HistoriqueStatutPaiementDto(
        Instant horodatage,
        TypeOperation typeOperation,
        String statutAvant,
        String statutApres,
        String acteur,
        String motif
) {
}
