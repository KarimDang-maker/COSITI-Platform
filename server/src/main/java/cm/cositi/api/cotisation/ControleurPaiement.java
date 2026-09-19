package cm.cositi.api.cotisation;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.EnregistrementPaiementDto;
import cm.cositi.api.cotisation.dto.PaiementDto;
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
import java.util.UUID;

@RestController
@RequestMapping("/paiements")
@Tag(name = "Cotisations & Paiements", description = "Enregistrement des collectes, circuit de confirmation hiérarchique et contrôle DAF")
public class ControleurPaiement {

    private final ServicePaiement servicePaiement;

    public ControleurPaiement(ServicePaiement servicePaiement) {
        this.servicePaiement = servicePaiement;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PAIEMENT:CREER')")
    @Operation(summary = "Enregistrer une saisie de paiement ou collecte (donnée financière pure)")
    public ResponseEntity<PaiementDto> enregistrer(
            @Valid @RequestBody EnregistrementPaiementDto dto,
            @AuthenticationPrincipal Utilisateur auteur) {
        PaiementDto cree = servicePaiement.enregistrer(dto, auteur);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(cree.id())
                .toUri();
        return ResponseEntity.created(location).body(cree);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    @Operation(summary = "Consulter le détail d'un paiement avec ses affectations")
    public ResponseEntity<PaiementDto> consulter(@PathVariable UUID id) {
        return ResponseEntity.ok(servicePaiement.consulter(id));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    @Operation(summary = "Rechercher et lister les paiements avec pagination et filtres")
    public ResponseEntity<ReponsePaginee<PaiementDto>> rechercher(
            @RequestParam(required = false) UUID adherentId,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) LocalDate du,
            @RequestParam(required = false) LocalDate au,
            @PageableDefault(size = 25) Pageable pageable) {
        return ResponseEntity.ok(servicePaiement.rechercher(adherentId, statut, du, au, pageable));
    }

    @PostMapping("/{id}/valider")
    @PreAuthorize("hasAuthority('PAIEMENT:VALIDER')")
    @Operation(summary = "Validation finale par le DAF avec affectation et calcul immédiat des droits")
    public ResponseEntity<PaiementDto> valider(
            @PathVariable UUID id,
            @AuthenticationPrincipal Utilisateur validateur) {
        return ResponseEntity.ok(servicePaiement.valider(id, validateur));
    }

    @PostMapping("/{id}/confirmer-chef")
    @PreAuthorize("hasAuthority('PAIEMENT:CONFIRMER') or hasRole('CHEF_AGENT_TERRAIN')")
    @Operation(summary = "Confirmation terrain intermédiaire par le Chef des agents de terrain")
    public ResponseEntity<PaiementDto> confirmerParChef(
            @PathVariable UUID id,
            @AuthenticationPrincipal Utilisateur chef) {
        return ResponseEntity.ok(servicePaiement.confirmerParChef(id, chef));
    }

    public record MotifDto(String motif) {}

    @PostMapping("/{id}/signaler-incoherence")
    @PreAuthorize("hasAuthority('PAIEMENT:VALIDER')")
    @Operation(summary = "Signalement d'incohérence par le DAF sans suppression de flux")
    public ResponseEntity<Void> signalerIncoherence(
            @PathVariable UUID id,
            @RequestBody MotifDto dto,
            @AuthenticationPrincipal Utilisateur daf) {
        servicePaiement.signalerIncoherence(id, dto.motif(), daf);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/annuler")
    @PreAuthorize("hasAuthority('PAIEMENT:ANNULER')")
    @Operation(summary = "Annuler un paiement avec invalidation des droits associés")
    public ResponseEntity<Void> annuler(
            @PathVariable UUID id,
            @RequestBody MotifDto dto,
            @AuthenticationPrincipal Utilisateur auteur) {
        servicePaiement.annuler(id, dto.motif(), auteur);
        return ResponseEntity.noContent().build();
    }
}
