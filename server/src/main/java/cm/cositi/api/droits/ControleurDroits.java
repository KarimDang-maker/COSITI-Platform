package cm.cositi.api.droits;

import cm.cositi.api.droits.dto.SituationDroitsDto;
import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/droits")
@Tag(name = "Droits & Régularité", description = "Consultation de la situation des droits sociaux, périodes couvertes et régularité")
public class ControleurDroits {

    private final ServiceCalculDroits serviceCalculDroits;
    private final PeriodeDroitsRepository periodeDroitsRepository;

    public ControleurDroits(ServiceCalculDroits serviceCalculDroits, PeriodeDroitsRepository periodeDroitsRepository) {
        this.serviceCalculDroits = serviceCalculDroits;
        this.periodeDroitsRepository = periodeDroitsRepository;
    }

    @GetMapping("/adherents/{id}")
    @PreAuthorize("hasAuthority('DROITS:LIRE')")
    @Operation(summary = "Consulter la situation consolidée des droits d'un adhérent à une date de référence")
    public ResponseEntity<SituationDroitsDto> situation(
            @PathVariable UUID id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au) {
        return ResponseEntity.ok(serviceCalculDroits.situation(id, au));
    }

    @GetMapping("/adherents/{id}/periodes")
    @PreAuthorize("hasAuthority('DROITS:LIRE')")
    @Operation(summary = "Lister l'historique complet des périodes de droits acquises")
    public ResponseEntity<List<PeriodeDroits>> periodes(@PathVariable UUID id) {
        return ResponseEntity.ok(periodeDroitsRepository.findByAdherentIdOrderByDateDebutAsc(id));
    }

    public record RecalculDto(String motif) {}

    @PostMapping("/adherents/{id}/recalculer")
    @PreAuthorize("hasAnyRole('DAF', 'SUPER_ADMIN')")
    @Operation(summary = "Déclencher un recalcul intégral des droits avec motif d'audit obligatoire")
    public ResponseEntity<Void> recalculer(
            @PathVariable UUID id,
            @RequestBody RecalculDto dto,
            @AuthenticationPrincipal Utilisateur auteur) {
        serviceCalculDroits.recalculer(id, dto.motif(), auteur);
        return ResponseEntity.noContent().build();
    }
}
