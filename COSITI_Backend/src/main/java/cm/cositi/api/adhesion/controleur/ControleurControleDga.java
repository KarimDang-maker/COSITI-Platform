package cm.cositi.api.adhesion.controleur;

import cm.cositi.api.adhesion.dto.ControleDgaDto;
import cm.cositi.api.adhesion.dto.DecisionControleDgaDto;
import cm.cositi.api.adhesion.dto.LigneFileControleDgaDto;
import cm.cositi.api.adhesion.dto.SyntheseControleDgaDto;
import cm.cositi.api.adhesion.dto.VerifierChampDto;
import cm.cositi.api.adhesion.dto.VerifierDocumentDto;
import cm.cositi.api.adhesion.entite.StatutControle;
import cm.cositi.api.adhesion.service.ServiceControleDga;
import cm.cositi.api.audit.AuditLigneDto;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Contrôle documentaire DGA (routes cibles {@code /dga/document-verifications} et {@code /document-verifications/…}
 * servies sous {@code /controles-dga}).
 */
@Tag(name = "Adhésion — contrôle documentaire DGA",
        description = "File DGA, comparaison donnée COSITI / document physique, anomalies, décision")
@RestController
@RequestMapping("/api/v1/controles-dga")
public class ControleurControleDga {

    private final ServiceControleDga service;

    public ControleurControleDga(ServiceControleDga service) {
        this.service = service;
    }

    @Operation(summary = "File de contrôle DGA",
            description = "Par défaut EN_ATTENTE et EN_COURS ; compteurs documents / vérifiés / anomalies par dossier.")
    @GetMapping
    public ReponsePaginee<LigneFileControleDgaDto> file(@RequestParam(required = false) List<StatutControle> statut,
                                                        @RequestParam(required = false) UUID agentId,
                                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
                                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
                                                        @RequestParam(defaultValue = "false") boolean avecAnomalie,
                                                        @RequestParam(defaultValue = "0") int page,
                                                        @RequestParam(defaultValue = "25") int taille,
                                                        @AuthenticationPrincipal Utilisateur demandeur) {
        if (du != null && au != null && du.isAfter(au)) {
            throw new ExceptionValidation("PERIODE_INVALIDE", "La date de début doit précéder la date de fin.", "du");
        }
        return service.file(statut, agentId, du, au, avecAnomalie,
                PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(taille, 200))), demandeur);
    }

    @Operation(summary = "Synthèse du contrôle DGA", description = "Dossiers distincts soumis (sans double comptage), états, anomalies.")
    @GetMapping("/synthese")
    public SyntheseControleDgaDto synthese(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
                                           @AuthenticationPrincipal Utilisateur demandeur) {
        return service.synthese(du, au, demandeur);
    }

    @Operation(summary = "Détail d'un contrôle", description = "Documents et, pour chacun, valeur COSITI / valeur document.")
    @GetMapping("/{id}")
    public ControleDgaDto consulter(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return service.consulter(id, demandeur);
    }

    @Operation(summary = "Journal du contrôle", description = "Chaque information vérifiée, anomalie et décision, depuis l'audit.")
    @GetMapping("/{id}/journal")
    public List<AuditLigneDto> journal(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return service.journal(id, demandeur);
    }

    @Operation(summary = "Démarrer le contrôle (DGA)")
    @PostMapping("/{id}/demarrer")
    public ControleDgaDto demarrer(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur dga) {
        return service.demarrer(id, dga);
    }

    @Operation(summary = "Vérifier une information",
            description = "CORRESPOND, NON_CORRESPOND (valeur lue + motif obligatoires), NON_VERIFIABLE, NON_LISIBLE, "
                    + "DOCUMENT_MANQUANT (motif obligatoire). `version` facultative.")
    @PostMapping("/{id}/champs/{champId}/verifier")
    public ControleDgaDto verifierChamp(@PathVariable UUID id, @PathVariable UUID champId,
                                        @Valid @RequestBody VerifierChampDto dto, @AuthenticationPrincipal Utilisateur dga) {
        return service.verifierChamp(id, champId, dto, dga);
    }

    @Operation(summary = "Constater un document manquant ou illisible", description = "S'applique à toutes ses informations.")
    @PostMapping("/{id}/documents/{documentId}/verifier")
    public ControleDgaDto verifierDocument(@PathVariable UUID id, @PathVariable UUID documentId,
                                           @Valid @RequestBody VerifierDocumentDto dto, @AuthenticationPrincipal Utilisateur dga) {
        return service.verifierDocument(id, documentId, dto, dga);
    }

    @Operation(summary = "Terminer le contrôle (DGA)",
            description = "VALIDER (toutes les informations vérifiées, aucune anomalie), DEMANDER_CORRECTION ou REJETER "
                    + "(motif obligatoire). Idempotent avec la même clé.")
    @PostMapping("/{id}/terminer")
    public ControleDgaDto terminer(@PathVariable UUID id, @Valid @RequestBody DecisionControleDgaDto dto,
                                   @AuthenticationPrincipal Utilisateur dga) {
        return service.terminer(id, dto, dga);
    }
}
