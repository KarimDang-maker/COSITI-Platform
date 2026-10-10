package cm.cositi.api.adhesion.controleur;

import cm.cositi.api.adhesion.dto.ConfigurationFraisAdhesionDto;
import cm.cositi.api.adhesion.dto.FraisAdhesionDto;
import cm.cositi.api.adhesion.dto.MotifDto;
import cm.cositi.api.adhesion.dto.RapprochementFraisAdhesionDto;
import cm.cositi.api.adhesion.dto.ResolutionAnomalieFraisDto;
import cm.cositi.api.adhesion.dto.SyntheseFraisAdhesionDto;
import cm.cositi.api.adhesion.entite.StatutFraisAdhesion;
import cm.cositi.api.adhesion.service.ServiceFraisAdhesion;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

/** Frais d'adhésion (routes cibles {@code /adhesion-fees} servies sous {@code /frais-adhesion}). */
@Tag(name = "Adhésion — frais d'adhésion",
        description = "Configuration, liste, validation de l'encaissement, anomalies, synthèses et rapprochement")
@RestController
@RequestMapping("/api/v1/frais-adhesion")
public class ControleurFraisAdhesion {

    private final ServiceFraisAdhesion service;

    public ControleurFraisAdhesion(ServiceFraisAdhesion service) {
        this.service = service;
    }

    @Operation(summary = "Montant unitaire courant", description = "Lu du paramètre MONTANT_INSCRIPTION, jamais dupliqué côté frontend.")
    @GetMapping("/configuration")
    public ConfigurationFraisAdhesionDto configuration() {
        return service.configuration();
    }

    @Operation(summary = "Lister les frais d'adhésion")
    @PreAuthorize("hasAuthority('FINANCES:CONSULTER')") // V23 §6 : rubrique Finances réservée au DAF
    @GetMapping
    public ReponsePaginee<FraisAdhesionDto> lister(@RequestParam(required = false) StatutFraisAdhesion statut,
                                                   @RequestParam(required = false) UUID agentId,
                                                   @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
                                                   @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
                                                   @RequestParam(defaultValue = "false") boolean seulementEcarts,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "25") int taille,
                                                   @AuthenticationPrincipal Utilisateur demandeur) {
        verifierPeriode(du, au);
        return service.lister(statut, agentId, du, au, seulementEcarts,
                PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(taille, 200)),
                        Sort.by(Sort.Direction.DESC, "dateCollecte").and(Sort.by("reference"))), demandeur);
    }

    @Operation(summary = "Synthèse des frais enregistrés (période)")
    @PreAuthorize("hasAuthority('FINANCES:CONSULTER')") // V23 §6 : rubrique Finances réservée au DAF
    @GetMapping("/synthese")
    public SyntheseFraisAdhesionDto synthese(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
                                             @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
                                             @AuthenticationPrincipal Utilisateur demandeur) {
        verifierPeriode(du, au);
        return service.synthese(du, au, null, demandeur);
    }

    @Operation(summary = "Synthèse des frais collectés par un agent (période)")
    @GetMapping("/agents/{agentId}/synthese")
    public SyntheseFraisAdhesionDto syntheseAgent(@PathVariable UUID agentId,
                                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
                                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
                                                  @AuthenticationPrincipal Utilisateur demandeur) {
        verifierPeriode(du, au);
        return service.synthese(du, au, agentId, demandeur);
    }

    @Operation(summary = "Rapprochement : dossiers distincts soumis × montant unitaire vs montant enregistré",
            description = "Écart = enregistré − attendu, signalé et jamais corrigé automatiquement ; détail du calcul fourni.")
    @PreAuthorize("hasAuthority('FINANCES:CONSULTER')") // V23 §6 : rubrique Finances réservée au DAF
    @GetMapping("/rapprochement")
    public RapprochementFraisAdhesionDto rapprochement(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
                                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
                                                       @RequestParam(required = false) UUID agentId,
                                                       @AuthenticationPrincipal Utilisateur demandeur) {
        verifierPeriode(du, au);
        return service.rapprochement(du, au, agentId, demandeur);
    }

    @Operation(summary = "Détail d'un frais d'adhésion")
    @GetMapping("/{id}")
    public FraisAdhesionDto consulter(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return service.consulter(id, demandeur);
    }

    @Operation(summary = "Valider l'encaissement (DAF)", description = "Jamais par l'auteur de l'enregistrement. `version` facultative.")
    @PostMapping("/{id}/valider")
    public FraisAdhesionDto valider(@PathVariable UUID id, @RequestParam(required = false) Long version,
                                    @AuthenticationPrincipal Utilisateur validateur) {
        return service.valider(id, version, validateur);
    }

    @Operation(summary = "Signaler une anomalie", description = "Motif obligatoire ; DAF et auteur de l'enregistrement notifiés.")
    @PostMapping("/{id}/anomalie")
    public FraisAdhesionDto signalerAnomalie(@PathVariable UUID id, @Valid @RequestBody MotifDto dto,
                                             @AuthenticationPrincipal Utilisateur auteur) {
        return service.signalerAnomalie(id, dto.motif(), auteur);
    }

    @Operation(summary = "Résoudre une anomalie", description = "Résolution motivée, correction éventuelle du montant tracée avant/après.")
    @PostMapping("/{id}/resoudre-anomalie")
    public FraisAdhesionDto resoudreAnomalie(@PathVariable UUID id, @Valid @RequestBody ResolutionAnomalieFraisDto dto,
                                             @AuthenticationPrincipal Utilisateur auteur) {
        return service.resoudreAnomalie(id, dto, auteur);
    }

    private static void verifierPeriode(LocalDate du, LocalDate au) {
        if (du != null && au != null && du.isAfter(au)) {
            throw new ExceptionValidation("PERIODE_INVALIDE", "La date de début doit précéder la date de fin.", "du");
        }
    }
}
