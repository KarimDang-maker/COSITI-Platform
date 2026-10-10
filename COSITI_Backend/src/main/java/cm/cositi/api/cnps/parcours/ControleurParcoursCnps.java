package cm.cositi.api.cnps.parcours;

import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Parcours CNPS : préimmatriculation (vagues mensuelles) puis immatriculation définitive.
 * Les chemins sont tous sous {@code /api/v1/cnps}.
 */
@RestController
@RequestMapping("/api/v1/cnps")
public class ControleurParcoursCnps {

    private final ServiceParcoursCnps service;

    public ControleurParcoursCnps(ServiceParcoursCnps service) {
        this.service = service;
    }

    /** Listes de la gestionnaire : à préimmatriculer, en retard, reportés, délai de dépôt, éligibles à l'immat. */
    @GetMapping("/parcours")
    public List<SituationParcoursDto> lister(@RequestParam(required = false) FiltreParcours filtre,
                                             @RequestParam(required = false) UUID zoneId,
                                             @AuthenticationPrincipal Utilisateur demandeur) {
        return service.lister(filtre, zoneId, demandeur);
    }

    @GetMapping("/parcours/resume")
    public ResumeParcoursDto resume(@RequestParam(required = false) UUID zoneId,
                                    @AuthenticationPrincipal Utilisateur demandeur) {
        return service.resume(zoneId, demandeur);
    }

    @GetMapping("/parcours/adherents/{adherentId}")
    public SituationParcoursDto consulter(@PathVariable UUID adherentId,
                                          @AuthenticationPrincipal Utilisateur demandeur) {
        return service.consulter(adherentId, demandeur);
    }

    @PostMapping("/parcours/adherents/{adherentId}/preimmatriculer")
    public SituationParcoursDto preimmatriculer(@PathVariable UUID adherentId,
                                                @Valid @RequestBody PreimmatriculationDto dto,
                                                @AuthenticationPrincipal Utilisateur auteur) {
        return service.preimmatriculer(adherentId, dto, auteur);
    }

    @PostMapping("/parcours/adherents/{adherentId}/depot-dossier")
    public SituationParcoursDto deposerDossier(@PathVariable UUID adherentId,
                                               @Valid @RequestBody DepotDossierDto dto,
                                               @AuthenticationPrincipal Utilisateur auteur) {
        return service.deposerDossier(adherentId, dto, auteur);
    }

    @PostMapping("/parcours/adherents/{adherentId}/immatriculer")
    public SituationParcoursDto immatriculer(@PathVariable UUID adherentId,
                                             @Valid @RequestBody ImmatriculationDto dto,
                                             @AuthenticationPrincipal Utilisateur auteur) {
        return service.immatriculer(adherentId, dto, auteur);
    }

    @GetMapping("/parametres")
    public ParametresParcoursDto parametres(@AuthenticationPrincipal Utilisateur demandeur) {
        return service.parametres(demandeur);
    }

    /** Réservé au DAF (et au Super admin) : quotas, jour de coupure, délai de dépôt. Motif obligatoire. */
    @PutMapping("/parametres")
    public ParametresParcoursDto modifierParametres(@Valid @RequestBody ParametresParcoursDto dto,
                                                    @AuthenticationPrincipal Utilisateur auteur) {
        return service.modifierParametres(dto, auteur);
    }
}
