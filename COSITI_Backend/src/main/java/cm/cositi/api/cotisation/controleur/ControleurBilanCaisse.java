package cm.cositi.api.cotisation.controleur;

import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.RapprochementCaisseDto;
import cm.cositi.api.cotisation.dto.SaisirCaissePhysiqueDto;
import cm.cositi.api.cotisation.dto.SignalerAnomalieBilanDto;
import cm.cositi.api.cotisation.entite.StatutBilanCaisse;
import cm.cositi.api.cotisation.service.ServiceBilanCaisse;
import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.time.LocalDate;

/**
 * Rapprochement journalier de caisse (#30 à #33) — routes cibles {@code /cotisations/daily-reconciliation} du
 * document, servies sous {@code /bilans-caisse}, identifiées par la date du bilan ({@code AAAA-MM-JJ}).
 */
@Tag(name = "Cotisations — bilan journalier de caisse",
        description = "Saisie de la caisse physique, écart avec le numérique, validation DAF, anomalies")
@RestController
@RequestMapping("/api/v1/bilans-caisse")
public class ControleurBilanCaisse {

    private final ServiceBilanCaisse serviceBilanCaisse;

    public ControleurBilanCaisse(ServiceBilanCaisse serviceBilanCaisse) {
        this.serviceBilanCaisse = serviceBilanCaisse;
    }

    @Operation(summary = "Lister les bilans de caisse")
    @GetMapping
    public ReponsePaginee<RapprochementCaisseDto> lister(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
            @RequestParam(required = false) StatutBilanCaisse statut,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @AuthenticationPrincipal Utilisateur demandeur) {
        if (du != null && au != null && du.isAfter(au)) {
            throw new ExceptionValidation("BILAN_CAISSE_PERIODE_INVALIDE", "La date de début doit précéder la date de fin.", "du");
        }
        int tailleBornee = Math.max(1, Math.min(taille, 200));
        return serviceBilanCaisse.lister(du, au, statut,
                PageRequest.of(Math.max(page, 0), tailleBornee, Sort.by(Sort.Direction.DESC, "dateBilan")), demandeur);
    }

    @Operation(summary = "Enregistrer le montant physique compté (#30)",
            description = "Un seul bilan par date ; ressaisie possible uniquement après une anomalie.")
    @PostMapping
    public ResponseEntity<RapprochementCaisseDto> saisir(@Valid @RequestBody SaisirCaissePhysiqueDto dto,
                                                         @AuthenticationPrincipal Utilisateur auteur) {
        RapprochementCaisseDto cree = serviceBilanCaisse.saisirCaissePhysique(dto.date(), dto.montantPhysique(),
                dto.commentaire(), auteur);
        return ResponseEntity.created(ServletUriComponentsBuilder.fromCurrentRequest().path("/{date}")
                .buildAndExpand(cree.date()).toUri()).body(cree);
    }

    @Operation(summary = "Consulter le rapprochement et l'écart de caisse d'une date (#31)")
    @GetMapping("/{date}")
    public RapprochementCaisseDto rapprochement(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                                @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceBilanCaisse.rapprochement(date, demandeur);
    }

    /**
     * Commentaire et version facultatifs en paramètres de requête, jamais en corps JSON optionnel — même choix que
     * {@code POST /paiements/{id}/confirmer-chef} : un corps optionnel exigerait un {@code Content-Type} à vide.
     * {@code version} active la concurrence optimiste : refus si le bilan a changé depuis sa lecture.
     */
    @Operation(summary = "Valider le bilan de caisse (DAF, #32)")
    @PostMapping("/{date}/valider")
    public RapprochementCaisseDto valider(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                          @RequestParam(required = false) String commentaire,
                                          @RequestParam(required = false) Long version,
                                          @AuthenticationPrincipal Utilisateur daf) {
        if (commentaire != null && commentaire.length() > 1000) {
            throw new ExceptionValidation("BILAN_CAISSE_COMMENTAIRE_TROP_LONG",
                    "Le commentaire ne peut pas dépasser 1000 caractères.", "commentaire");
        }
        return serviceBilanCaisse.valider(date, commentaire, version, daf);
    }

    @Operation(summary = "Signaler une anomalie sur le bilan (DAF, #33)", description = "Motif obligatoire, auteur notifié.")
    @PostMapping("/{date}/anomalie")
    public RapprochementCaisseDto signalerAnomalie(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                                   @Valid @RequestBody SignalerAnomalieBilanDto dto,
                                                   @AuthenticationPrincipal Utilisateur daf) {
        return serviceBilanCaisse.signalerAnomalie(date, dto.motif(), daf);
    }
}
