package cm.cositi.api.organisation.service;

import cm.cositi.api.organisation.dto.DecisionObjectifDto;
import cm.cositi.api.organisation.dto.ObjectifRecouvrementDto;
import cm.cositi.api.organisation.dto.PropositionObjectifDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.util.List;
import java.util.UUID;

/**
 * Objectif de recouvrement mensuel d'un agent (RAPORT_V1.md §4.4/§6.5) — la Gestionnaire ou le Chef
 * propose, la DGA décide (arbitrage, §6.11 : jamais de modification de la proposition par l'arbitre).
 */
public interface ServiceObjectifRecouvrement {

    ObjectifRecouvrementDto proposer(UUID agentId, PropositionObjectifDto dto, Utilisateur auteur);

    ObjectifRecouvrementDto decider(UUID objectifId, DecisionObjectifDto dto, Utilisateur dga);

    List<ObjectifRecouvrementDto> historique(UUID agentId);
}
