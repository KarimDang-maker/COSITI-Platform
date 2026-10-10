package cm.cositi.api.workflow.controleur;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.workflow.dto.CreationDemandeValidationDto;
import cm.cositi.api.workflow.dto.DecisionDemandeDto;
import cm.cositi.api.workflow.dto.DecisionDemandeValidationDto;
import cm.cositi.api.workflow.dto.DemandeValidationDto;
import cm.cositi.api.workflow.dto.DocumentDemandeValidationDto;
import cm.cositi.api.workflow.dto.ElementDemandeValidationDto;
import cm.cositi.api.workflow.dto.JoindreJustificatifDto;
import cm.cositi.api.workflow.dto.ResoumissionDemandeDto;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;
import cm.cositi.api.workflow.service.ServiceDemandeValidation;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.List;
import java.util.UUID;

/**
 * Socle transversal de correction, validation et traçabilité (docs/COSITI_V1_BACKEND_MISE_A_JOUR_3_MODULES_WORKFLOW.md
 * §8). Routes cibles {@code /validation-requests} servies sous {@code /demandes-validation}, convention française du
 * projet. Les corps de décision sont facultatifs ; {@code Idempotency-Key} est accepté en en-tête.
 */
@Tag(name = "Workflow — demandes de validation",
        description = "Création, soumission, approbation, rejet, correction, resoumission, justificatifs (3 modules)")
@RestController
@RequestMapping("/api/v1/demandes-validation")
public class ControleurDemandeValidation {

    private final ServiceDemandeValidation service;

    public ControleurDemandeValidation(ServiceDemandeValidation service) {
        this.service = service;
    }

    @Operation(summary = "Créer une demande", description = "`soumettre=true` crée et soumet en une seule opération.")
    @PostMapping
    public ResponseEntity<DemandeValidationDto> creer(@Valid @RequestBody CreationDemandeValidationDto dto,
                                                      @AuthenticationPrincipal Utilisateur demandeur) {
        DemandeValidationDto cree = service.creer(dto, demandeur);
        return ResponseEntity.created(ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}")
                .buildAndExpand(cree.id()).toUri()).body(cree);
    }

    @Operation(summary = "Lister les demandes visibles", description = "Filtrées par périmètre et permission de lecture.")
    @GetMapping
    public ReponsePaginee<DemandeValidationDto> lister(@RequestParam(required = false) StatutDemandeValidation statut,
                                                       @RequestParam(required = false) TypeEntiteWorkflow typeEntite,
                                                       @RequestParam(required = false) TypeOperationWorkflow typeOperation,
                                                       @RequestParam(required = false) UUID entiteId,
                                                       @RequestParam(defaultValue = "false") boolean mesDemandes,
                                                       @RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "25") int taille,
                                                       @AuthenticationPrincipal Utilisateur demandeur) {
        return service.lister(statut, typeEntite, typeOperation, entiteId, mesDemandes, pagination(page, taille),
                demandeur);
    }

    @Operation(summary = "File de validation",
            description = "Demandes soumises que l'utilisateur est habilité à décider — jamais les siennes.")
    @GetMapping("/en-attente")
    public ReponsePaginee<DemandeValidationDto> enAttente(@RequestParam(required = false) TypeEntiteWorkflow typeEntite,
                                                          @RequestParam(defaultValue = "0") int page,
                                                          @RequestParam(defaultValue = "25") int taille,
                                                          @AuthenticationPrincipal Utilisateur validateur) {
        return service.listerEnAttente(typeEntite, pagination(page, taille), validateur);
    }

    @Operation(summary = "Détail d'une demande")
    @GetMapping("/{id}")
    public DemandeValidationDto consulter(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return service.consulter(id, demandeur);
    }

    @Operation(summary = "Soumettre une demande en brouillon")
    @PostMapping("/{id}/soumettre")
    public DemandeValidationDto soumettre(@PathVariable UUID id,
                                          @Valid @RequestBody(required = false) DecisionDemandeDto dto,
                                          @AuthenticationPrincipal Utilisateur demandeur) {
        return service.soumettre(id, dto, demandeur);
    }

    @Operation(summary = "Approuver et appliquer",
            description = "Transactionnel : version vérifiée (409 si la donnée a changé), application atomique, audit.")
    @PostMapping("/{id}/approuver")
    public DemandeValidationDto approuver(@PathVariable UUID id,
                                          @Valid @RequestBody(required = false) DecisionDemandeDto dto,
                                          @AuthenticationPrincipal Utilisateur validateur) {
        return service.approuver(id, dto, validateur);
    }

    @Operation(summary = "Rejeter", description = "Commentaire (motif) obligatoire.")
    @PostMapping("/{id}/rejeter")
    public DemandeValidationDto rejeter(@PathVariable UUID id, @Valid @RequestBody DecisionDemandeDto dto,
                                        @AuthenticationPrincipal Utilisateur validateur) {
        return service.rejeter(id, dto, validateur);
    }

    @Operation(summary = "Demander une correction", description = "Commentaire (motif) obligatoire.")
    @PostMapping("/{id}/demander-correction")
    public DemandeValidationDto demanderCorrection(@PathVariable UUID id, @Valid @RequestBody DecisionDemandeDto dto,
                                                   @AuthenticationPrincipal Utilisateur validateur) {
        return service.demanderCorrection(id, dto, validateur);
    }

    @Operation(summary = "Resoumettre après correction",
            description = "`elements` facultatif : remplace les propositions d'une demande de modification.")
    @PostMapping("/{id}/resoumettre")
    public DemandeValidationDto resoumettre(@PathVariable UUID id,
                                            @Valid @RequestBody(required = false) ResoumissionDemandeDto dto,
                                            @AuthenticationPrincipal Utilisateur demandeur) {
        return service.resoumettre(id, dto, demandeur);
    }

    @Operation(summary = "Annuler une demande ouverte (auteur uniquement)")
    @PostMapping("/{id}/annuler")
    public DemandeValidationDto annuler(@PathVariable UUID id,
                                        @Valid @RequestBody(required = false) DecisionDemandeDto dto,
                                        @AuthenticationPrincipal Utilisateur demandeur) {
        return service.annuler(id, dto, demandeur);
    }

    @Operation(summary = "Champs concernés (ancienne / nouvelle valeur)")
    @GetMapping("/{id}/elements")
    public List<ElementDemandeValidationDto> elements(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return service.elements(id, demandeur);
    }

    @Operation(summary = "Décisions et transitions de la demande")
    @GetMapping("/{id}/decisions")
    public List<DecisionDemandeValidationDto> decisions(@PathVariable UUID id,
                                                        @AuthenticationPrincipal Utilisateur demandeur) {
        return service.decisions(id, demandeur);
    }

    @Operation(summary = "Justificatifs joints")
    @GetMapping("/{id}/justificatifs")
    public List<DocumentDemandeValidationDto> justificatifs(@PathVariable UUID id,
                                                            @AuthenticationPrincipal Utilisateur demandeur) {
        return service.documents(id, demandeur);
    }

    @Operation(summary = "Joindre un justificatif",
            description = "Le document est d'abord téléversé par POST /api/v1/documents, puis rattaché ici.")
    @PostMapping("/{id}/justificatifs")
    public ResponseEntity<DocumentDemandeValidationDto> joindre(@PathVariable UUID id,
                                                                @Valid @RequestBody JoindreJustificatifDto dto,
                                                                @AuthenticationPrincipal Utilisateur demandeur) {
        DocumentDemandeValidationDto lien = service.joindreJustificatif(id, dto.documentId(), demandeur);
        return ResponseEntity.status(201).body(lien);
    }

    private static PageRequest pagination(int page, int taille) {
        return PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(taille, 200)));
    }
}
