package cm.cositi.api.document;

import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/documents")
@Tag(name = "Gestion Documentaire", description = "Téléversement sécurisé, vérification et consultation des pièces justificatives")
public class ControleurDocument {

    private final ServiceStockageDocument serviceStockageDocument;

    public ControleurDocument(ServiceStockageDocument serviceStockageDocument) {
        this.serviceStockageDocument = serviceStockageDocument;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('DOCUMENT:TELEVERSER')")
    @Operation(summary = "Téléverser une pièce justificative ou document d'identité (max 10 Mo)")
    public ResponseEntity<Document> televerser(
            @RequestParam("fichier") MultipartFile fichier,
            @RequestParam("typeDocument") String typeDocument,
            @RequestParam(value = "adherentId", required = false) UUID adherentId,
            @RequestParam(value = "paiementId", required = false) UUID paiementId,
            @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.ok(serviceStockageDocument.televerser(fichier, typeDocument, adherentId, paiementId, auteur));
    }

    @GetMapping("/{id}/metadonnees")
    @PreAuthorize("hasAuthority('DOCUMENT:LIRE')")
    @Operation(summary = "Consulter les métadonnées et l'empreinte de contrôle d'un document")
    public ResponseEntity<Document> consulterMetadonnees(
            @PathVariable UUID id,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return ResponseEntity.ok(serviceStockageDocument.consulterMetadonnees(id, demandeur));
    }
}
