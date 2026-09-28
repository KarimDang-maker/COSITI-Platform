package cm.cositi.api.organisation.service;

import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.organisation.dto.ChargeAgentDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

public interface ServicePortefeuille {

    void affecter(UUID adherentId, UUID agentId, String motif, Utilisateur auteur);

    /** Clôt l'affectation ouverte avant d'en créer une nouvelle, dans la même transaction. Motif obligatoire. */
    void transferer(UUID adherentId, UUID nouvelAgentId, String motif, Utilisateur auteur);

    void transfererEnLot(List<UUID> adherentIds, UUID nouvelAgentId, String motif, Utilisateur auteur);

    List<AdherentResumeDto> portefeuille(UUID agentId, Utilisateur demandeur);

    List<AdherentResumeDto> sansAgentReferent(UUID zoneId);

    ChargeAgentDto charge(UUID agentId, YearMonth periode);
}
