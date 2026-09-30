package cm.cositi.api.droits.controleur;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.droits.dto.AdherentEnRetardDto;
import cm.cositi.api.droits.dto.CritereRetard;
import cm.cositi.api.droits.dto.PeriodeDroitsDto;
import cm.cositi.api.droits.dto.RecalculerDroitsDto;
import cm.cositi.api.droits.dto.SituationDroitsDto;
import cm.cositi.api.droits.service.ServiceCalculDroits;
import cm.cositi.api.droits.service.ServiceRegularite;
import cm.cositi.api.securite.entite.Utilisateur;
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

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** docs/03_SPECIFICATIONS_API.md §5 — Droits et régularité (jalon J6). */
@RestController
@RequestMapping("/api/v1/droits")
public class ControleurDroits {

    private final ServiceCalculDroits serviceCalculDroits;
    private final ServiceRegularite serviceRegularite;

    public ControleurDroits(ServiceCalculDroits serviceCalculDroits, ServiceRegularite serviceRegularite) {
        this.serviceCalculDroits = serviceCalculDroits;
        this.serviceRegularite = serviceRegularite;
    }

    @GetMapping("/adherents/{id}")
    public SituationDroitsDto situation(@PathVariable UUID id,
                                         @RequestParam(name = "au", required = false) LocalDate au,
                                         @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceCalculDroits.situation(id, au != null ? au : LocalDate.now(), demandeur);
    }

    @GetMapping("/adherents/{id}/periodes")
    public List<PeriodeDroitsDto> periodes(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceCalculDroits.periodes(id, demandeur);
    }

    @PostMapping("/adherents/{id}/recalculer")
    public ResponseEntity<Void> recalculer(@PathVariable UUID id, @Valid @RequestBody RecalculerDroitsDto dto,
                                            @AuthenticationPrincipal Utilisateur auteur) {
        serviceCalculDroits.recalculer(id, dto.motif(), auteur);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/retardataires")
    public ReponsePaginee<AdherentEnRetardDto> retardataires(
            @RequestParam(required = false) UUID zoneId,
            @RequestParam(required = false) UUID agentId,
            @RequestParam(required = false) Integer joursRetardMin,
            @RequestParam(required = false) UUID packId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @AuthenticationPrincipal Utilisateur demandeur) {
        var critere = new CritereRetard(zoneId, agentId, joursRetardMin, packId);
        int tailleBornee = Math.min(taille, 200);
        return serviceRegularite.retardataires(critere, PageRequest.of(page, tailleBornee), demandeur);
    }
}
