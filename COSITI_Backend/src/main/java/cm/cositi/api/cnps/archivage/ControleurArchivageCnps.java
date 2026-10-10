package cm.cositi.api.cnps.archivage;

import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cnps")
public class ControleurArchivageCnps {

    private final ServiceChecklistArchivage service;

    public ControleurArchivageCnps(ServiceChecklistArchivage service) {
        this.service = service;
    }

    @GetMapping("/dossiers/{dossierId}/checklist-archivage")
    public ChecklistArchivageDto consulter(@PathVariable UUID dossierId,
                                           @AuthenticationPrincipal Utilisateur demandeur) {
        return service.consulter(dossierId, demandeur);
    }

    @PatchMapping("/dossiers/{dossierId}/checklist-archivage/{codePiece}")
    public ChecklistArchivageDto mettreAJour(@PathVariable UUID dossierId, @PathVariable String codePiece,
                                             @Valid @RequestBody MiseAJourChecklistDto dto,
                                             @AuthenticationPrincipal Utilisateur auteur) {
        return service.mettreAJour(dossierId, codePiece, dto, auteur);
    }

    /** Rapport : dossiers non immatriculés dont des pièces bloquantes ne sont pas encore vérifiées. */
    @GetMapping("/archivage/dossiers-incomplets")
    public List<DossierIncompletDto> dossiersIncomplets(@AuthenticationPrincipal Utilisateur demandeur) {
        return service.dossiersIncomplets(demandeur);
    }
}
