package cm.cositi.api.adherent;

import cm.cositi.api.adherent.dto.*;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/adherents")
@Tag(name = "Adhérents", description = "Gestion du référentiel des adhérents, enrôlement et détection de doublons")
public class ControleurAdherent {

    private final ServiceAdherent serviceAdherent;
    private final ServiceDoublonAdherent serviceDoublonAdherent;

    public ControleurAdherent(ServiceAdherent serviceAdherent, ServiceDoublonAdherent serviceDoublonAdherent) {
        this.serviceAdherent = serviceAdherent;
        this.serviceDoublonAdherent = serviceDoublonAdherent;
    }

    @PostMapping("/verifier-doublon")
    @PreAuthorize("hasAuthority('ADHERENT:CREER')")
    @Operation(summary = "Rechercher les doublons potentiels (téléphone, CNI, nom) avant soumission")
    public ResponseEntity<List<CandidatDoublonDto>> verifierDoublon(@RequestBody CritereDoublonDto critere) {
        return ResponseEntity.ok(serviceDoublonAdherent.rechercher(critere));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADHERENT:CREER')")
    @Operation(summary = "Enrôler un nouvel adhérent avec attribution de matricule immuable")
    public ResponseEntity<AdherentDetailDto> creer(
            @Valid @RequestBody CreationAdherentDto dto,
            @AuthenticationPrincipal Utilisateur auteur) {
        AdherentDetailDto cree = serviceAdherent.creer(dto, auteur);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(cree.id())
                .toUri();
        return ResponseEntity.created(location).body(cree);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    @Operation(summary = "Consulter la fiche détaillée d'un adhérent")
    public ResponseEntity<AdherentDetailDto> consulter(
            @PathVariable UUID id,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return ResponseEntity.ok(serviceAdherent.consulter(id, demandeur));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    @Operation(summary = "Recherche paginée d'adhérents avec filtres")
    public ResponseEntity<ReponsePaginee<AdherentResumeDto>> rechercher(
            @RequestParam(required = false) String recherche,
            @RequestParam(required = false) UUID zoneId,
            @RequestParam(required = false) String statut,
            @PageableDefault(size = 25) Pageable pageable,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return ResponseEntity.ok(serviceAdherent.rechercher(recherche, zoneId, statut, pageable, demandeur));
    }

    public record MotifActionDto(String motif) {}
    public record ChangementStatutDto(String statut, String motif) {}
    public record ChangementPackDto(UUID packId, LocalDate effetLe) {}

    @PostMapping("/{id}/archiver")
    @PreAuthorize("hasAuthority('ADHERENT:ARCHIVER')")
    @Operation(summary = "Archiver logiquement un adhérent avec motif obligatoire")
    public ResponseEntity<Void> archiver(
            @PathVariable UUID id,
            @RequestBody MotifActionDto dto,
            @AuthenticationPrincipal Utilisateur auteur) {
        serviceAdherent.archiver(id, dto.motif(), auteur);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/statut")
    @PreAuthorize("hasAuthority('ADHERENT:CHANGER_STATUT')")
    @Operation(summary = "Changer le statut de l'adhérent (actif, inactif, en retard...)")
    public ResponseEntity<Void> changerStatut(
            @PathVariable UUID id,
            @RequestBody ChangementStatutDto dto,
            @AuthenticationPrincipal Utilisateur auteur) {
        serviceAdherent.changerStatut(id, dto.statut(), dto.motif(), auteur);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/pack")
    @PreAuthorize("hasAuthority('ADHERENT:MODIFIER')")
    @Operation(summary = "Modifier le pack de souscription de l'adhérent")
    public ResponseEntity<Void> changerPack(
            @PathVariable UUID id,
            @RequestBody ChangementPackDto dto,
            @AuthenticationPrincipal Utilisateur auteur) {
        serviceAdherent.changerPack(id, dto.packId(), dto.effetLe() != null ? dto.effetLe() : LocalDate.now(), auteur);
        return ResponseEntity.noContent().build();
    }
}
