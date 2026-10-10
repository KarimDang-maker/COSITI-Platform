package cm.cositi.api.organisation.service;

import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.organisation.dto.AffectationPortefeuilleDto;
import cm.cositi.api.organisation.dto.AgentDto;
import cm.cositi.api.organisation.dto.ChargeAgentDto;
import cm.cositi.api.organisation.dto.DistributionPortefeuilleDto;
import cm.cositi.api.organisation.dto.ResumePortefeuilleDto;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

public interface ServicePortefeuille {

    void affecter(UUID adherentId, UUID agentId, String motif, Utilisateur auteur);

    /** Clôt l'affectation ouverte avant d'en créer une nouvelle, dans la même transaction. Motif obligatoire. */
    void transferer(UUID adherentId, UUID nouvelAgentId, String motif, Utilisateur auteur);

    void transfererEnLot(List<UUID> adherentIds, UUID nouvelAgentId, String motif, Utilisateur auteur);

    /** #9 — paginé (contrairement à la liste brute d'origine). */
    ReponsePaginee<AdherentResumeDto> portefeuille(UUID agentId, Pageable pageable, Utilisateur demandeur);

    List<AdherentResumeDto> sansAgentReferent(UUID zoneId);

    ChargeAgentDto charge(UUID agentId, YearMonth periode);

    /** #22 — agent actuellement affecté à un adhérent. */
    AgentDto agentActuel(UUID adherentId, Utilisateur demandeur);

    /** #8, #10, #11 — résumé chiffré (total, dossiers complets/incomplets — même formule que le module adhérents). */
    ResumePortefeuilleDto resumePortefeuille(UUID agentId, Utilisateur demandeur);

    /** #17 — clôture logique de l'affectation ouverte, sans en ouvrir une nouvelle. */
    void retirer(UUID adherentId, String motif, Utilisateur auteur);

    /** #19 — nombre d'adhérents actuellement suivis, par agent actif. */
    List<DistributionPortefeuilleDto> distribution(Utilisateur demandeur);

    /** #24 — historique complet (ouvert + clôturé) des affectations d'un agent, jamais supprimé. */
    List<AffectationPortefeuilleDto> historiquePortefeuille(UUID agentId, Utilisateur demandeur);
}
