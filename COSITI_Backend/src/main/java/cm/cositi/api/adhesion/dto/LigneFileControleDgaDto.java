package cm.cositi.api.adhesion.dto;

import cm.cositi.api.adhesion.entite.StatutControle;

import java.time.Instant;
import java.util.UUID;

/** Ligne de la file de contrôle DGA (§12). */
public record LigneFileControleDgaDto(
        UUID controleId,
        String reference,
        int tour,
        StatutControle statut,
        UUID adherentId,
        String matricule,
        String nom,
        UUID agentCollecteurId,
        String agentCollecteur,
        String gestionnaire,
        Instant activeLe,
        Instant soumisLe,
        long nombreDocuments,
        long nombreDocumentsVerifies,
        long nombreAnomalies
) {
}
