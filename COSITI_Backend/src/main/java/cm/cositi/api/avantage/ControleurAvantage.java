package cm.cositi.api.avantage;

import cm.cositi.api.avantage.AvantageDtos.AvantageAdherentDto;
import cm.cositi.api.avantage.AvantageDtos.AvantageDto;
import cm.cositi.api.avantage.AvantageDtos.BeneficiaireDto;
import cm.cositi.api.avantage.AvantageDtos.ResultatRecalculDto;
import cm.cositi.api.avantage.AvantageDtos.SaisieAvantageDto;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
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

@RestController
@RequestMapping("/api/v1")
public class ControleurAvantage {

    private final ServiceAvantage service;

    public ControleurAvantage(ServiceAvantage service) {
        this.service = service;
    }

    @GetMapping("/avantages")
    public List<AvantageDto> catalogue(@RequestParam(defaultValue = "false") boolean inclureInactifs,
                                       @AuthenticationPrincipal Utilisateur demandeur) {
        return service.catalogue(inclureInactifs, demandeur);
    }

    @GetMapping("/avantages/{id}")
    public AvantageDto consulter(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return service.consulter(id, demandeur);
    }

    @PostMapping("/avantages")
    public ResponseEntity<AvantageDto> creer(@Valid @RequestBody SaisieAvantageDto dto,
                                             @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.status(201).body(service.creer(dto, auteur));
    }

    @PutMapping("/avantages/{id}")
    public AvantageDto modifier(@PathVariable UUID id, @Valid @RequestBody SaisieAvantageDto dto,
                                @AuthenticationPrincipal Utilisateur auteur) {
        return service.modifier(id, dto, auteur);
    }

    /** Qui bénéficie de cet avantage (ACQUIS par défaut) — ou qui s'en approche (EN_COURS), qui l'a perdu (SUSPENDU). */
    @GetMapping("/avantages/{id}/beneficiaires")
    public List<BeneficiaireDto> beneficiaires(@PathVariable UUID id,
                                               @RequestParam(required = false) StatutAvantage statut,
                                               @RequestParam(required = false) UUID zoneId,
                                               @AuthenticationPrincipal Utilisateur demandeur) {
        return service.beneficiaires(id, statut, zoneId, demandeur);
    }

    @PostMapping("/avantages/recalculer")
    public ResultatRecalculDto recalculer(@AuthenticationPrincipal Utilisateur demandeur) {
        return service.recalculer(demandeur);
    }

    @GetMapping("/adherents/{adherentId}/avantages")
    public List<AvantageAdherentDto> avantagesDeLAdherent(@PathVariable UUID adherentId,
                                                          @AuthenticationPrincipal Utilisateur demandeur) {
        return service.avantagesDeLAdherent(adherentId, demandeur);
    }
}
