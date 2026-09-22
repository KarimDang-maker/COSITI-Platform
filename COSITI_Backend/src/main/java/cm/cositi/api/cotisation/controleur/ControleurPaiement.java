package cm.cositi.api.cotisation.controleur;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.AffectationDto;
import cm.cositi.api.cotisation.dto.AffecterManuelDto;
import cm.cositi.api.cotisation.dto.AnnulerPaiementDto;
import cm.cositi.api.cotisation.dto.CorrectionPaiementDto;
import cm.cositi.api.cotisation.dto.CritereJournalPaiement;
import cm.cositi.api.cotisation.dto.EnregistrementPaiementDto;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.cotisation.dto.RecuDto;
import cm.cositi.api.cotisation.entite.StatutPaiement;
import cm.cositi.api.cotisation.service.ResultatEnregistrementPaiement;
import cm.cositi.api.cotisation.service.ServiceAffectationPaiement;
import cm.cositi.api.cotisation.service.ServicePaiement;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/paiements")
public class ControleurPaiement {

    private final ServicePaiement servicePaiement;
    private final ServiceAffectationPaiement serviceAffectationPaiement;

    public ControleurPaiement(ServicePaiement servicePaiement, ServiceAffectationPaiement serviceAffectationPaiement) {
        this.servicePaiement = servicePaiement;
        this.serviceAffectationPaiement = serviceAffectationPaiement;
    }

    @GetMapping
    public ReponsePaginee<PaiementDto> journal(
            @RequestParam(required = false) UUID adherentId,
            @RequestParam(required = false) StatutPaiement statut,
            @RequestParam(required = false) String modePaiement,
            @RequestParam(required = false) LocalDate dateDu,
            @RequestParam(required = false) LocalDate dateAu,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @AuthenticationPrincipal Utilisateur demandeur) {
        var critere = new CritereJournalPaiement(adherentId, statut, modePaiement, dateDu, dateAu);
        int tailleBornee = Math.min(taille, 200);
        return servicePaiement.journal(critere,
                PageRequest.of(page, tailleBornee, Sort.by(Sort.Direction.DESC, "datePaiement")), demandeur);
    }

    @PostMapping
    public ResponseEntity<PaiementDto> enregistrer(@Valid @RequestBody EnregistrementPaiementDto dto,
                                                     @RequestHeader(value = "Idempotency-Key", required = false) String cleIdempotence,
                                                     @AuthenticationPrincipal Utilisateur auteur) {
        if (cleIdempotence == null || cleIdempotence.isBlank()) {
            // docs/03_SPECIFICATIONS_API.md §1 : en-tête obligatoire sur POST /paiements.
            throw new ExceptionValidation("IDEMPOTENCY_KEY_MANQUANTE", "L'en-tête Idempotency-Key est obligatoire.");
        }
        ResultatEnregistrementPaiement resultat = servicePaiement.enregistrer(dto, cleIdempotence, auteur);
        if (resultat.dejaExistant()) {
            return ResponseEntity.ok(resultat.paiement());
        }
        URI localisation = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}")
                .buildAndExpand(resultat.paiement().id()).toUri();
        return ResponseEntity.created(localisation).body(resultat.paiement());
    }

    @GetMapping("/{id}")
    public PaiementDto consulter(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePaiement.consulter(id, demandeur);
    }

    @PostMapping("/{id}/valider")
    public PaiementDto valider(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur validateur) {
        return servicePaiement.valider(id, validateur);
    }

    @PostMapping("/{id}/corriger")
    public PaiementDto corriger(@PathVariable UUID id, @RequestBody CorrectionPaiementDto dto,
                                 @AuthenticationPrincipal Utilisateur auteur) {
        return servicePaiement.corriger(id, dto, auteur);
    }

    @PostMapping("/{id}/annuler")
    public ResponseEntity<Void> annuler(@PathVariable UUID id, @Valid @RequestBody AnnulerPaiementDto dto,
                                         @AuthenticationPrincipal Utilisateur auteur) {
        servicePaiement.annuler(id, dto, auteur);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/recu")
    public RecuDto recu(@PathVariable UUID id) {
        return servicePaiement.genererRecu(id);
    }

    @GetMapping("/{id}/affectations")
    public List<AffectationDto> affectations(@PathVariable UUID id) {
        return serviceAffectationPaiement.lister(id);
    }

    @PostMapping("/{id}/affectations")
    public List<AffectationDto> affecter(@PathVariable UUID id, @Valid @RequestBody AffecterManuelDto dto,
                                          @AuthenticationPrincipal Utilisateur auteur) {
        return serviceAffectationPaiement.affecterManuellement(id, dto.lignes(), auteur);
    }
}
