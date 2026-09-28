package cm.cositi.api.organisation.service;

import cm.cositi.api.organisation.dto.AgentDto;
import cm.cositi.api.organisation.dto.CreationAgentDto;
import cm.cositi.api.organisation.dto.HistoriqueDesignationChefDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.util.List;
import java.util.UUID;

/**
 * Contrat {@code [A]} — création et désignation, non confirmé formellement mais nécessaire pour coder le
 * jalon J3 (voir docs/02_CLASSES_ET_METHODES.md « ServiceAgent », Roles des acteurs.md §14).
 */
public interface ServiceAgent {

    /** DGA-F01 — réservé au rôle DGA, audité {@code AGENT_CREATION_PAR_DGA}. Crée aussi le compte de connexion. */
    AgentDto creerParDga(CreationAgentDto dto, Utilisateur dga);

    /** DGA-F02 — réservé au rôle DGA. */
    AgentDto affecter(UUID agentId, UUID zoneId, Utilisateur dga);

    /** DGA-F03 — réservé au rôle DGA, motif obligatoire, audité {@code AGENT_DESIGNATION_CHEF}. */
    AgentDto designerChef(UUID agentId, String motif, Utilisateur dga);

    /** DGA-F04 — réservé au rôle DGA, motif obligatoire, audité {@code AGENT_REMPLACEMENT_CHEF}. */
    AgentDto remplacerChef(UUID nouvelAgentId, String motif, Utilisateur dga);

    List<HistoriqueDesignationChefDto> historiqueChef(UUID zoneId);

    /** Chef courant de la zone (dernier enregistrement de l'historique), ou vide si aucun. */
    AgentDto chefCourant(UUID zoneId);
}
