package cm.cositi.api.adherent.controleur;

import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.workflow.dto.DemandeModificationDto;
import cm.cositi.api.workflow.dto.DemandeValidationDto;
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
 * Workflow du module Adhérents (§9) : soumission du dossier, état et historique de validation, demandes de
 * modification d'un dossier validé. Décisions : {@code /api/v1/demandes-validation/{id}/…}.
 */
@Tag(name = "Workflow — adhérents", description = "Validation du dossier et modifications officielles par demande")
@RestController
@RequestMapping("/api/v1/adherents")
public class ControleurWorkflowAdherent {

    private final ServiceDemandeValidation service;

    public ControleurWorkflowAdherent(ServiceDemandeValidation service) {
        this.service = service;
    }

    @Operation(summary = "Soumettre le dossier à validation",
            description = "Crée la demande ADHERENT_VALIDATION_DOSSIER, ou resoumet celle renvoyée en correction. "
                    + "Le dossier est verrouillé jusqu'à la décision.")
    @PostMapping("/{id}/soumettre")
    public DemandeValidationDto soumettre(@PathVariable UUID id, @Valid @RequestBody(required = false) SoumissionEntiteDto dto,
                                          @AuthenticationPrincipal Utilisateur demandeur) {
        return service.soumettreEntite(TypeOperationWorkflow.ADHERENT_VALIDATION_DOSSIER, id, dto, demandeur);
    }

    @Operation(summary = "État de validation du dossier")
    @GetMapping("/{id}/statut-validation")
    public StatutValidationEntiteDto statutValidation(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return service.statutEntite(TypeEntiteWorkflow.ADHERENT, id, demandeur);
    }

    @Operation(summary = "Historique des demandes de validation et de modification")
    @GetMapping("/{id}/historique-validation")
    public List<DemandeValidationDto> historiqueValidation(@PathVariable UUID id,
                                                           @AuthenticationPrincipal Utilisateur demandeur) {
        return service.historiqueEntite(TypeEntiteWorkflow.ADHERENT, id, null, demandeur);
    }

    @Operation(summary = "Demander la modification d'une donnée officielle",
            description = "Seule voie de modification d'un dossier validé. Soumise immédiatement sauf `brouillon=true`.")
    @PostMapping("/{id}/demandes-modification")
    public ResponseEntity<DemandeValidationDto> demanderModification(@PathVariable UUID id,
                                                                     @Valid @RequestBody DemandeModificationDto dto,
                                                                     @AuthenticationPrincipal Utilisateur demandeur) {
        return ResponseEntity.status(201)
                .body(service.creerPourEntite(TypeOperationWorkflow.ADHERENT_MODIFICATION, id, dto, demandeur));
    }

    @Operation(summary = "Demandes de modification du dossier")
    @GetMapping("/{id}/demandes-modification")
    public List<DemandeValidationDto> demandesModification(@PathVariable UUID id,
                                                           @AuthenticationPrincipal Utilisateur demandeur) {
        return service.historiqueEntite(TypeEntiteWorkflow.ADHERENT, id,
                List.of(TypeOperationWorkflow.ADHERENT_MODIFICATION), demandeur);
    }

    @Operation(summary = "Détail d'une demande de modification du dossier")
    @GetMapping("/{id}/demandes-modification/{demandeId}")
    public DemandeValidationDto demandeModification(@PathVariable UUID id, @PathVariable UUID demandeId,
                                                    @AuthenticationPrincipal Utilisateur demandeur) {
        return service.consulterPourEntite(TypeEntiteWorkflow.ADHERENT, id, demandeId, demandeur);
    }
}
