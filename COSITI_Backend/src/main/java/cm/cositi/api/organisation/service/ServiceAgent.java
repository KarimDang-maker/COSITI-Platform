package cm.cositi.api.organisation.service;

import cm.cositi.api.audit.AuditLigneDto;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.organisation.dto.AgentDto;
import cm.cositi.api.organisation.dto.ChangerStatutAgentDto;
import cm.cositi.api.organisation.dto.CreationAgentDto;
import cm.cositi.api.organisation.dto.CritereRechercheAgent;
import cm.cositi.api.organisation.dto.HistoriqueDesignationChefDto;
import cm.cositi.api.organisation.dto.ModificationAgentDto;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Contrat {@code [A]} — création et désignation, non confirmé formellement mais nécessaire pour coder le
 * jalon J3 (voir docs/02_CLASSES_ET_METHODES.md « ServiceAgent », Roles des acteurs.md §14).
 */
public interface ServiceAgent {

    /** #1, #2, #21 — liste paginée, filtrable par recherche libre/statut/zone. */
    ReponsePaginee<AgentDto> lister(CritereRechercheAgent critere, Pageable pageable, Utilisateur demandeur);

    /** #3 — permission vérifiée ici (corrige l'accès direct au repository depuis le contrôleur). */
    AgentDto consulter(UUID id, Utilisateur demandeur);

    /** DGA-F01 — réservé au rôle DGA, audité {@code AGENT_CREATION_PAR_DGA}. Crée aussi le compte de connexion. */
    AgentDto creerParDga(CreationAgentDto dto, Utilisateur dga);

    /** #5 — réservé DGA, même garde que la création. */
    AgentDto modifier(UUID id, ModificationAgentDto dto, Utilisateur dga);

    /** #6 — activation/désactivation, motif obligatoire dans les deux sens. */
    AgentDto changerStatut(UUID id, ChangerStatutAgentDto dto, Utilisateur dga);

    /** DGA-F02 — réservé au rôle DGA. */
    AgentDto affecter(UUID agentId, UUID zoneId, Utilisateur dga);

    /** DGA-F03 — réservé au rôle DGA, motif obligatoire, audité {@code AGENT_DESIGNATION_CHEF}. */
    AgentDto designerChef(UUID agentId, String motif, Utilisateur dga);

    /** DGA-F04 — réservé au rôle DGA. */
    AgentDto remplacerChef(UUID nouvelAgentId, String motif, Utilisateur dga);

    List<HistoriqueDesignationChefDto> historiqueChef(UUID zoneId);

    /** Chef courant de la zone (dernier enregistrement de l'historique), ou vide si aucun. */
    AgentDto chefCourant(UUID zoneId);

    /** #7, #22, #23 — opérations journalisées concernant cet agent, filtrables par période. */
    List<AuditLigneDto> operations(UUID id, Instant depuis, Instant jusqua, Utilisateur demandeur);
}
