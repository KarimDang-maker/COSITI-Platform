package cm.cositi.api.organisation.controleur;

import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.workflow.dto.DemandeChangementStatutAgentDto;
import cm.cositi.api.workflow.dto.DemandeModificationDto;
import cm.cositi.api.workflow.dto.DemandeValidationDto;
import cm.cositi.api.workflow.dto.PropositionChampDto;
import cm.cositi.api.workflow.dto.SoumissionEntiteDto;
import cm.cositi.api.workflow.dto.StatutValidationEntiteDto;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;
import cm.cositi.api.workflow.service.ServiceDemandeValidation;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Workflow du module Agents de terrain (§10). Routes cibles {@code /agents-terrain/{id}/…} servies sous
 * {@code /agents/{id}/…}, convention réelle du projet. Décisions : {@code /api/v1/demandes-validation/{id}/…}.
 */
@Tag(name = "Workflow — agents de terrain",
        description = "Validation du profil, modifications et changements de statut par demande")
@RestController
@RequestMapping("/api/v1/agents")
public class ControleurWorkflowAgent {

    private final ServiceDemandeValidation service;

    public ControleurWorkflowAgent(ServiceDemandeValidation service) {
        this.service = service;
    }

    @Operation(summary = "Soumettre le profil d'agent à validation")
    @PostMapping("/{id}/soumettre")
    public DemandeValidationDto soumettre(@PathVariable UUID id, @Valid @RequestBody(required = false) SoumissionEntiteDto dto,
                                          @AuthenticationPrincipal Utilisateur demandeur) {
        return service.soumettreEntite(TypeOperationWorkflow.AGENT_VALIDATION_PROFIL, id, dto, demandeur);
    }

    @Operation(summary = "État de validation du profil")
    @GetMapping("/{id}/statut-validation")
    public StatutValidationEntiteDto statutValidation(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return service.statutEntite(TypeEntiteWorkflow.AGENT, id, demandeur);
    }

    @Operation(summary = "Historique des demandes du profil")
    @GetMapping("/{id}/historique-validation")
    public List<DemandeValidationDto> historiqueValidation(@PathVariable UUID id,
                                                           @AuthenticationPrincipal Utilisateur demandeur) {
        return service.historiqueEntite(TypeEntiteWorkflow.AGENT, id, null, demandeur);
    }

    @Operation(summary = "Demander la modification d'un profil validé",
            description = "Champs : nomComplet, telephone, zoneId, objectifCollecteMensuel.")
    @PostMapping("/{id}/demandes-modification")
    public ResponseEntity<DemandeValidationDto> demanderModification(@PathVariable UUID id,
                                                                     @Valid @RequestBody DemandeModificationDto dto,
                                                                     @AuthenticationPrincipal Utilisateur demandeur) {
        return ResponseEntity.status(201)
                .body(service.creerPourEntite(TypeOperationWorkflow.AGENT_MODIFICATION, id, dto, demandeur));
    }

    @Operation(summary = "Demandes de modification du profil")
    @GetMapping("/{id}/demandes-modification")
    public List<DemandeValidationDto> demandesModification(@PathVariable UUID id,
                                                           @AuthenticationPrincipal Utilisateur demandeur) {
        return service.historiqueEntite(TypeEntiteWorkflow.AGENT, id,
                List.of(TypeOperationWorkflow.AGENT_MODIFICATION), demandeur);
    }

    @Operation(summary = "Demander l'activation ou la désactivation d'un agent validé",
            description = "Désactivation logique, motivée et validée — jamais de suppression.")
    @PostMapping("/{id}/demandes-changement-statut")
    public ResponseEntity<DemandeValidationDto> demanderChangementStatut(@PathVariable UUID id,
                                                                         @Valid @RequestBody DemandeChangementStatutAgentDto dto,
                                                                         @AuthenticationPrincipal Utilisateur demandeur) {
        DemandeModificationDto demande = new DemandeModificationDto(dto.motif(),
                List.of(new PropositionChampDto("actif", String.valueOf(dto.actif()), dto.motif())),
                dto.documentIds(), dto.versionBase(), dto.cleIdempotence(), false);
        return ResponseEntity.status(201)
                .body(service.creerPourEntite(TypeOperationWorkflow.AGENT_CHANGEMENT_STATUT, id, demande, demandeur));
    }

    @Operation(summary = "Demandes de changement de statut de l'agent")
    @GetMapping("/{id}/demandes-changement-statut")
    public List<DemandeValidationDto> demandesChangementStatut(@PathVariable UUID id,
                                                               @AuthenticationPrincipal Utilisateur demandeur) {
        return service.historiqueEntite(TypeEntiteWorkflow.AGENT, id,
                List.of(TypeOperationWorkflow.AGENT_CHANGEMENT_STATUT), demandeur);
    }
}
