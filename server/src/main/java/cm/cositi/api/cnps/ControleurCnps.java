package cm.cositi.api.cnps;

import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/cnps")
@Tag(name = "Pôle CNPS", description = "Gestion des dossiers d'immatriculation, pièces justificatives et déclarations mensuelles")
public class ControleurCnps {

    private final ServiceDossierCnps serviceDossierCnps;
    private final DossierCnpsRepository dossierCnpsRepository;

    public ControleurCnps(ServiceDossierCnps serviceDossierCnps, DossierCnpsRepository dossierCnpsRepository) {
        this.serviceDossierCnps = serviceDossierCnps;
        this.dossierCnpsRepository = dossierCnpsRepository;
    }

    public record OuvertureDossierDto(UUID adherentId) {}
    public record AjoutPieceDto(UUID documentId, String typePiece) {}
    public record ChangementStatutDossierDto(String statut, String commentaire) {}

    @PostMapping("/dossiers")
    @PreAuthorize("hasAuthority('CNPS:CREER')")
    @Operation(summary = "Ouvrir un dossier d'immatriculation CNPS pour un adhérent")
    public ResponseEntity<DossierCnps> ouvrirDossier(
            @RequestBody OuvertureDossierDto dto,
            @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.ok(serviceDossierCnps.ouvrir(dto.adherentId(), auteur));
    }

    @GetMapping("/dossiers/{id}")
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    @Operation(summary = "Consulter le statut et les pièces d'un dossier CNPS")
    public ResponseEntity<DossierCnps> consulterDossier(@PathVariable UUID id) {
        return ResponseEntity.ok(dossierCnpsRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Dossier CNPS", id)));
    }

    @PostMapping("/dossiers/{id}/pieces")
    @PreAuthorize("hasAuthority('CNPS:MODIFIER')")
    @Operation(summary = "Rattacher une pièce justificative validée à un dossier CNPS")
    public ResponseEntity<PieceDossierCnps> ajouterPiece(
            @PathVariable UUID id,
            @RequestBody AjoutPieceDto dto,
            @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.ok(serviceDossierCnps.ajouterPiece(id, dto.documentId(), dto.typePiece(), auteur));
    }

    @PostMapping("/dossiers/{id}/statut")
    @PreAuthorize("hasAuthority('CNPS:CHANGER_STATUT')")
    @Operation(summary = "Faire évoluer le statut d'un dossier CNPS (BROUILLON, PRET, TRANSMIS, TRAITE, REJETE)")
    public ResponseEntity<DossierCnps> changerStatut(
            @PathVariable UUID id,
            @RequestBody ChangementStatutDossierDto dto,
            @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.ok(serviceDossierCnps.changerStatut(id, dto.statut(), dto.commentaire(), auteur));
    }

    @GetMapping("/dossiers/{id}/pieces-manquantes")
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    @Operation(summary = "Lister les pièces obligatoires manquantes d'un dossier")
    public ResponseEntity<List<PieceDossierCnps>> piecesManquantes(@PathVariable UUID id) {
        return ResponseEntity.ok(serviceDossierCnps.piecesManquantes(id));
    }
}
