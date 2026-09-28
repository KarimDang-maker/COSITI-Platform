package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.entite.StatutAdherent;

import java.time.LocalDate;
import java.util.UUID;

public record CritereRechercheAdherent(
        String recherche,
        UUID zoneId,
        UUID activiteId,
        StatutAdherent statut,
        UUID packId,
        UUID associationId,
        Boolean sansAgentReferent,
        LocalDate dateAdhesionDu,
        LocalDate dateAdhesionAu
) {
}
