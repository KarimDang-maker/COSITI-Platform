package cm.cositi.api.daf.controleur;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.daf.dto.ProductionRapportDto;
import cm.cositi.api.daf.dto.RapportDafDto;
import cm.cositi.api.daf.entite.StatutRapportDaf;
import cm.cositi.api.daf.service.ServiceRapportDaf;
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

import java.util.UUID;

/** docs/03_SPECIFICATIONS_API.md §9 — Rapports DAF (jalon J10). */
@RestController
@RequestMapping("/api/v1/daf/rapports")
public class ControleurRapportDaf {

    private final ServiceRapportDaf serviceRapportDaf;

    public ControleurRapportDaf(ServiceRapportDaf serviceRapportDaf) {
        this.serviceRapportDaf = serviceRapportDaf;
    }

    @GetMapping
    public ReponsePaginee<RapportDafDto> lister(@RequestParam(required = false) StatutRapportDaf statut,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "25") int taille,
                                                 @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceRapportDaf.lister(statut, PageRequest.of(page, Math.min(taille, 200)), demandeur);
    }

    @GetMapping("/{id}")
    public RapportDafDto consulter(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceRapportDaf.consulter(id, demandeur);
    }

    @PostMapping
    public ResponseEntity<RapportDafDto> produire(@Valid @RequestBody ProductionRapportDto dto,
                                                   @AuthenticationPrincipal Utilisateur daf) {
        return ResponseEntity.status(201).body(serviceRapportDaf.produire(dto, daf));
    }

    /** Sans corps : le destinataire est le PCA par définition du flux (Roles des acteurs.md §12.3). */
    @PostMapping("/{id}/transmettre")
    public RapportDafDto transmettre(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur daf) {
        return serviceRapportDaf.transmettreAuPca(id, daf);
    }
}
