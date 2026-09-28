package cm.cositi.api.cotisation.dto;

import cm.cositi.api.cotisation.entite.StatutPaiement;

import java.time.LocalDate;
import java.util.UUID;

public record CritereJournalPaiement(
        UUID adherentId,
        StatutPaiement statut,
        String modePaiement,
        LocalDate dateDu,
        LocalDate dateAu
) {
}
