package cm.cositi.api.organisation.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.organisation.dto.AgentDto;
import cm.cositi.api.organisation.entite.Agent;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.organisation.repository.ZoneRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import cm.cositi.api.workflow.dto.DecisionDemandeDto;
import cm.cositi.api.workflow.entite.DemandeValidation;
import cm.cositi.api.workflow.entite.ElementDemandeValidation;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.StatutValidationEntite;
import cm.cositi.api.workflow.entite.TypeDonneeChamp;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;
import cm.cositi.api.workflow.service.AdaptateurWorkflow;
import cm.cositi.api.workflow.service.EtatEntite;
import cm.cositi.api.workflow.service.ValeursWorkflow;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Module Agents de terrain dans le workflow (§10) : validation du profil créé par la DGA, modification d'un profil
 * validé, activation/désactivation contrôlée. La désignation du Chef garde son circuit DGA dédié, déjà audité.
 */
@Component
public class AdaptateurWorkflowAgent implements AdaptateurWorkflow {

    private static final Map<String, TypeDonneeChamp> CHAMPS_MODIFICATION = new LinkedHashMap<>();
    private static final Map<String, TypeDonneeChamp> CHAMPS_STATUT = Map.of("actif", TypeDonneeChamp.BOOLEEN);
    private static final Map<String, TypeDonneeChamp> CHAMPS_PROFIL;

    static {
        CHAMPS_MODIFICATION.put("nomComplet", TypeDonneeChamp.TEXTE);
        CHAMPS_MODIFICATION.put("telephone", TypeDonneeChamp.TEXTE);
        CHAMPS_MODIFICATION.put("zoneId", TypeDonneeChamp.UUID);
        CHAMPS_MODIFICATION.put("objectifCollecteMensuel", TypeDonneeChamp.DECIMAL);
        CHAMPS_PROFIL = new LinkedHashMap<>(CHAMPS_MODIFICATION);
        CHAMPS_PROFIL.put("actif", TypeDonneeChamp.BOOLEEN);
    }

    private final AgentRepository agentRepository;
    private final ZoneRepository zoneRepository;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAudit serviceAudit;
    private final ApplicationEventPublisher evenements;
    private final JdbcTemplate jdbcTemplate;

    public AdaptateurWorkflowAgent(AgentRepository agentRepository, ZoneRepository zoneRepository,
                                   ServicePerimetreDonnees perimetre, ServiceAudit serviceAudit,
                                   ApplicationEventPublisher evenements, JdbcTemplate jdbcTemplate) {
        this.agentRepository = agentRepository;
        this.zoneRepository = zoneRepository;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
        this.evenements = evenements;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public TypeEntiteWorkflow typeEntite() {
        return TypeEntiteWorkflow.AGENT;
    }

    @Override
    public Map<String, TypeDonneeChamp> champs(TypeOperationWorkflow operation) {
        return switch (operation) {
            case AGENT_VALIDATION_PROFIL -> CHAMPS_PROFIL;
            case AGENT_CHANGEMENT_STATUT -> CHAMPS_STATUT;
            default -> CHAMPS_MODIFICATION;
        };
    }

    @Override
    public EtatEntite etat(UUID entiteId, boolean verrouiller) {
        if (verrouiller) {
            try {
                jdbcTemplate.queryForObject("SELECT version FROM agent WHERE id = ? FOR UPDATE", Long.class, entiteId);
            } catch (EmptyResultDataAccessException e) {
                throw introuvable();
            }
        }
        Agent a = charger(entiteId);
        return new EtatEntite(a.getVersion() == null ? 0 : a.getVersion(), valeurs(a), a.getStatutValidation().name(),
                a.getStatutValidation().modifiableDirectement());
    }

    /** Agents : périmètre global (direction, DAF, Gestionnaire) ou l'agent lui-même. */
    @Override
    public boolean peutAcceder(UUID entiteId, Utilisateur utilisateur) {
        return perimetre.estPerimetreGlobal(utilisateur) || entiteId.equals(utilisateur.getAgentId());
    }

    @Override
    public void controlerOuverture(UUID entiteId, TypeOperationWorkflow operation) {
        Agent a = charger(entiteId);
        if (a.isArchive()) {
            throw new ExceptionConflit("AGENT_ARCHIVE", "Cet agent est archivé.");
        }
        StatutValidationEntite statut = a.getStatutValidation();
        if (operation == TypeOperationWorkflow.AGENT_VALIDATION_PROFIL) {
            if (statut == StatutValidationEntite.VALIDE) {
                throw new ExceptionConflit("AGENT_DEJA_VALIDE", "Ce profil d'agent est déjà validé.");
            }
            if (statut != StatutValidationEntite.BROUILLON && statut != StatutValidationEntite.REJETE) {
                throw new ExceptionConflit("AGENT_TRANSITION_INTERDITE",
                        "Ce profil ne peut pas être soumis dans son état actuel (" + statut + ").");
            }
        } else if (statut != StatutValidationEntite.VALIDE) {
            throw new ExceptionConflit("AGENT_NON_VALIDE",
                    "Ce profil n'est pas encore validé : modifiez-le directement puis soumettez-le à validation.");
        }
    }

    @Override
    public void controlerPropositions(UUID entiteId, TypeOperationWorkflow operation,
                                      Map<String, String> valeursResultantes, Map<String, String> propositions) {
        if (operation == TypeOperationWorkflow.AGENT_CHANGEMENT_STATUT) {
            if (valeursResultantes.get("actif") == null) {
                throw invalide("actif", "Le statut demandé est obligatoire.");
            }
            return;
        }
        if (valeursResultantes.get("nomComplet") == null) {
            throw invalide("nomComplet", "Le nom complet est obligatoire.");
        }
        if (valeursResultantes.get("telephone") == null) {
            throw invalide("telephone", "Le téléphone est obligatoire.");
        }
        if (propositions.containsKey("zoneId")) {
            UUID zoneId = ValeursWorkflow.enUuid(propositions.get("zoneId"));
            if (zoneId == null || zoneRepository.findById(zoneId).isEmpty()) {
                throw invalide("zoneId", "Zone introuvable.");
            }
        }
        String objectif = propositions.get("objectifCollecteMensuel");
        if (objectif != null && ValeursWorkflow.enDecimal(objectif).signum() < 0) {
            throw invalide("objectifCollecteMensuel", "L'objectif de collecte ne peut pas être négatif.");
        }
    }

    @Override
    public List<String> controlerAvantApprobation(DemandeValidation demande, DecisionDemandeDto decision,
                                                  Utilisateur validateur) {
        List<String> avertissements = new ArrayList<>();
        if (demande.getTypeOperation() == TypeOperationWorkflow.AGENT_CHANGEMENT_STATUT) {
            Long supervises = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM agent WHERE chef_agent_id = ? AND archive = false", Long.class,
                    demande.getEntiteId());
            if (supervises != null && supervises > 0) {
                avertissements.add("Cet agent supervise " + supervises + " agent(s) en tant que Chef : la désignation "
                        + "du Chef est à revoir par la DGA.");
            }
        }
        return avertissements;
    }

    @Override
    public List<String> appliquer(DemandeValidation demande, List<ElementDemandeValidation> elements,
                                  Utilisateur validateur) {
        Agent a = charger(demande.getEntiteId());
        String motif = "Demande " + demande.getReference() + " : " + demande.getMotif();
        switch (demande.getTypeOperation()) {
            case AGENT_VALIDATION_PROFIL -> {
                serviceAudit.tracer(TypeOperation.AGENT_VALIDATION_PROFIL, "agent", a.getId(), null,
                        AgentDto.depuis(a), motif);
                evenements.publishEvent(new AgentModifieEvent(a.getId(), "VALIDATION_PROFIL"));
            }
            case AGENT_CHANGEMENT_STATUT -> {
                boolean avant = a.isActif();
                for (ElementDemandeValidation e : elements) {
                    appliquerChamp(a, e.getChamp(), e.getValeurProposee());
                }
                a = agentRepository.saveAndFlush(a);
                // Désactivation logique (§10) : l'agent n'est jamais supprimé, son historique reste intact.
                serviceAudit.tracer(TypeOperation.AGENT_CHANGEMENT_STATUT, "agent", a.getId(), avant, a.isActif(), motif);
                evenements.publishEvent(new AgentModifieEvent(a.getId(), "CHANGEMENT_STATUT_VALIDE"));
            }
            default -> {
                AgentDto avant = AgentDto.depuis(a);
                for (ElementDemandeValidation e : elements) {
                    appliquerChamp(a, e.getChamp(), e.getValeurProposee());
                }
                a = agentRepository.saveAndFlush(a);
                serviceAudit.tracer(TypeOperation.AGENT_MODIFICATION, "agent", a.getId(), avant, AgentDto.depuis(a), motif);
                evenements.publishEvent(new AgentModifieEvent(a.getId(), "MODIFICATION_VALIDEE"));
            }
        }
        return List.of();
    }

    @Override
    public void synchroniserStatut(UUID entiteId, TypeOperationWorkflow operation,
                                   StatutDemandeValidation statutDemande) {
        if (operation != TypeOperationWorkflow.AGENT_VALIDATION_PROFIL) {
            return;
        }
        StatutValidationEntite cible = switch (statutDemande) {
            case EN_ATTENTE_VALIDATION -> StatutValidationEntite.EN_ATTENTE_VALIDATION;
            case CORRECTION_DEMANDEE -> StatutValidationEntite.CORRECTION_DEMANDEE;
            case APPROUVEE -> StatutValidationEntite.VALIDE;
            case REJETEE -> StatutValidationEntite.REJETE;
            case ANNULEE -> StatutValidationEntite.BROUILLON;
            case BROUILLON -> null;
        };
        Agent a = charger(entiteId);
        if (cible != null && a.getStatutValidation() != cible) {
            a.setStatutValidation(cible);
            agentRepository.saveAndFlush(a);
        }
    }

    @Override
    public UUID adherentConcerne(UUID entiteId) {
        return null;
    }

    private static Map<String, String> valeurs(Agent a) {
        Map<String, String> v = new LinkedHashMap<>();
        v.put("nomComplet", ValeursWorkflow.texte(a.getNomComplet()));
        v.put("telephone", ValeursWorkflow.texte(a.getTelephone()));
        v.put("zoneId", ValeursWorkflow.texte(a.getZoneId()));
        v.put("objectifCollecteMensuel", ValeursWorkflow.texte(a.getObjectifCollecteMensuel()));
        v.put("actif", ValeursWorkflow.texte(a.isActif()));
        return v;
    }

    private static void appliquerChamp(Agent a, String champ, String valeur) {
        switch (champ) {
            case "nomComplet" -> a.setNomComplet(valeur);
            case "telephone" -> a.setTelephone(valeur);
            case "zoneId" -> a.setZoneId(ValeursWorkflow.enUuid(valeur));
            case "objectifCollecteMensuel" -> a.setObjectifCollecteMensuel(ValeursWorkflow.enDecimal(valeur));
            case "actif" -> a.setActif(Boolean.TRUE.equals(ValeursWorkflow.enBooleen(valeur)));
            default -> throw new IllegalStateException("Champ agent non applicable : " + champ);
        }
    }

    private static ExceptionValidation invalide(String champ, String message) {
        return new ExceptionValidation("DEMANDE_VALEUR_INVALIDE", message, champ);
    }

    private Agent charger(UUID id) {
        return agentRepository.findById(id).orElseThrow(AdaptateurWorkflowAgent::introuvable);
    }

    private static ExceptionRessourceIntrouvable introuvable() {
        return new ExceptionRessourceIntrouvable("AGENT_INTROUVABLE", "Agent introuvable.");
    }
}
