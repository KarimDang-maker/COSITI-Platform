package cm.cositi.api.document.controleur;

import cm.cositi.api.document.dto.ChangementStatutDocumentDto;
import cm.cositi.api.document.dto.ContenuDocument;
import cm.cositi.api.document.dto.DocumentDto;
import cm.cositi.api.document.dto.RattachementDto;
import cm.cositi.api.document.entite.TypeDocument;
import cm.cositi.api.document.service.ServiceStockageDocument;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

/**
 * docs/03_SPECIFICATIONS_API.md §8 — Documents (jalon J7).
 *
 * <p>Aucune URL publique, aucun lien signé permanent : le contenu ne sort que par
 * {@code GET /documents/{id}}, après contrôle d'accès et périmètre de données, et chaque téléchargement est
 * journalisé par le service.</p>
 */
@RestController
@RequestMapping("/api/v1/documents")
public class ControleurDocument {

    private final ServiceStockageDocument serviceDocument;

    public ControleurDocument(ServiceStockageDocument serviceDocument) {
        this.serviceDocument = serviceDocument;
    }

    /**
     * Téléversement en {@code multipart/form-data}. Le rattachement est passé en paramètres de requête plutôt
     * qu'en partie JSON : une partie JSON dans un multipart impose au client de fixer un {@code Content-Type}
     * par partie, ce que les clients de test comme les navigateurs gèrent de façon inégale (même classe de
     * problème que le corps optionnel de {@code confirmer-chef}, corrigé au jalon J5).
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentDto> televerser(@RequestPart("fichier") MultipartFile fichier,
                                                   @RequestParam TypeDocument type,
                                                   @RequestParam(required = false) UUID adherentId,
                                                   @RequestParam(required = false) UUID paiementId,
                                                   @AuthenticationPrincipal Utilisateur auteur) {
        DocumentDto cree = serviceDocument.televerser(fichier, type, new RattachementDto(adherentId, paiementId), auteur);
        return ResponseEntity.status(201).body(cree);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> telecharger(@PathVariable UUID id,
                                                 @AuthenticationPrincipal Utilisateur demandeur) {
        ContenuDocument contenu = serviceDocument.telecharger(id, demandeur);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(contenu.nomFichier(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contenu.typeMime()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                // Donnée personnelle : jamais mise en cache par un intermédiaire (docs/04_SECURITE.md §6).
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(new ByteArrayResource(contenu.octets()));
    }

    @GetMapping("/{id}/metadonnees")
    public DocumentDto metadonnees(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceDocument.metadonnees(id, demandeur);
    }

    @PostMapping("/{id}/statut")
    public DocumentDto changerStatut(@PathVariable UUID id,
                                      @Valid @RequestBody ChangementStatutDocumentDto dto,
                                      @AuthenticationPrincipal Utilisateur auteur) {
        return serviceDocument.changerStatut(id, dto.statut(), dto.motif(), auteur);
    }

    @GetMapping
    public List<DocumentDto> lister(@RequestParam(required = false) UUID adherentId,
                                     @RequestParam(required = false) UUID paiementId,
                                     @AuthenticationPrincipal Utilisateur demandeur) {
        if (adherentId != null) {
            return serviceDocument.listerParAdherent(adherentId, demandeur);
        }
        if (paiementId != null) {
            return serviceDocument.listerParPaiement(paiementId, demandeur);
        }
        // Pas de liste globale des documents : sans rattachement, il n'y a pas de périmètre de données à
        // appliquer, donc pas de réponse défendable (docs/04_SECURITE.md §3).
        return List.of();
    }
}
