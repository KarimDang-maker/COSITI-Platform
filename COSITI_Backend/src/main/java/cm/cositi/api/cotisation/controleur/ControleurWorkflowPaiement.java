package cm.cositi.api.cotisation.controleur;

import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.workflow.dto.DemandeModificationDto;
import cm.cositi.api.workflow.dto.DemandeValidationDto;
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
 * Workflow du module Cotisations (§11). Correspondance avec les routes cibles du document, sans doublon :
 * {@code submit} = {@code POST /paiements/{id}/soumettre}, {@code validate} = {@code …/valider},
 * {@code reject} = {@code …/rejeter}, {@code request-correction} = {@code …/signaler-incoherence} (DAF), tous déjà
 * existants. Ajouté ici : la correction contrôlée d'une cotisation soumise ou validée, et son suivi.
 */
@Tag(name = "Workflow — cotisations", description = "Correction contrôlée d'une cotisation, validée par le DAF")
@RestController
@RequestMapping("/api/v1/paiements")
public class ControleurWorkflowPaiement {

    private final ServiceDemandeValidation service;

    public ControleurWorkflowPaiement(ServiceDemandeValidation service) {
        this.service = service;
    }

    @Operation(summary = "État de validation de la cotisation")
    @GetMapping("/{id}/statut-validation")
    public StatutValidationEntiteDto statutValidation(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return service.statutEntite(TypeEntiteWorkflow.PAIEMENT, id, demandeur);
    }

    @Operation(summary = "Historique des demandes de correction de la cotisation",
            description = "La chronologie des statuts de saisie reste sur GET /paiements/{id}/historique-statuts.")
    @GetMapping("/{id}/historique-validation")
    public List<DemandeValidationDto> historiqueValidation(@PathVariable UUID id,
                                                           @AuthenticationPrincipal Utilisateur demandeur) {
        return service.historiqueEntite(TypeEntiteWorkflow.PAIEMENT, id, null, demandeur);
    }

    @Operation(summary = "Demander la correction d'une cotisation soumise ou validée",
            description = "Champs : montant, datePaiement, modePaiement, referenceTransaction. Approuvée par le DAF, "
                    + "appliquée en une transaction (invariants, ré-affectation, recalcul des droits, audit).")
    @PostMapping("/{id}/demandes-correction")
    public ResponseEntity<DemandeValidationDto> demanderCorrection(@PathVariable UUID id,
                                                                   @Valid @RequestBody DemandeModificationDto dto,
                                                                   @AuthenticationPrincipal Utilisateur demandeur) {
        return ResponseEntity.status(201)
                .body(service.creerPourEntite(TypeOperationWorkflow.PAIEMENT_CORRECTION, id, dto, demandeur));
    }

    @Operation(summary = "Demandes de correction de la cotisation")
    @GetMapping("/{id}/demandes-correction")
    public List<DemandeValidationDto> demandesCorrection(@PathVariable UUID id,
                                                         @AuthenticationPrincipal Utilisateur demandeur) {
        return service.historiqueEntite(TypeEntiteWorkflow.PAIEMENT, id,
                List.of(TypeOperationWorkflow.PAIEMENT_CORRECTION), demandeur);
    }
}
