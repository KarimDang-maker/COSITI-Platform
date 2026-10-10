package cm.cositi.api.cotisation.dto;

import cm.cositi.api.cotisation.entite.StatutPaiement;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Critères du journal des paiements. {@code adherentMatricule} (#3) et {@code reference} (#5 — numéro de reçu
 * ou référence de transaction) sont résolus côté serveur.
 */
public record CritereJournalPaiement(
        UUID adherentId,
        StatutPaiement statut,
        String modePaiement,
        LocalDate dateDu,
        LocalDate dateAu,
        UUID agentId,
        String adherentMatricule,
        String reference
) {
    public CritereJournalPaiement(UUID adherentId, StatutPaiement statut, String modePaiement, LocalDate dateDu,
                                   LocalDate dateAu, UUID agentId) {
        this(adherentId, statut, modePaiement, dateDu, dateAu, agentId, null, null);
    }
}
