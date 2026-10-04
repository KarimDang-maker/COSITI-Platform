package cm.cositi.api.cotisation.controleur;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.AffectationDto;
import cm.cositi.api.cotisation.dto.AffecterManuelDto;
import cm.cositi.api.cotisation.dto.AnnulerPaiementDto;
import cm.cositi.api.cotisation.dto.BilanJournalierDto;
import cm.cositi.api.cotisation.dto.CorrectionPaiementDto;
import cm.cositi.api.cotisation.dto.CritereJournalPaiement;
import cm.cositi.api.cotisation.dto.EnregistrementPaiementDto;
import cm.cositi.api.cotisation.dto.HistoriqueStatutPaiementDto;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.cotisation.dto.RecuDto;
import cm.cositi.api.cotisation.dto.RejeterPaiementDto;
import cm.cositi.api.cotisation.dto.ResultatDoublonPaiementDto;
import cm.cositi.api.cotisation.dto.SignalerIncoherenceDto;
import cm.cositi.api.cotisation.dto.StatistiquesQuotidiennesDto;
import cm.cositi.api.cotisation.dto.VerifierDoublonPaiementDto;
import cm.cositi.api.cotisation.entite.StatutPaiement;
import cm.cositi.api.cotisation.service.ResultatEnregistrementPaiement;
import cm.cositi.api.cotisation.service.ServiceAffectationPaiement;
import cm.cositi.api.cotisation.service.ServiceBilanCaisse;
import cm.cositi.api.cotisation.service.ServicePaiement;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Module « Gestion des cotisations » (docs/COSITI_GESTIONNAIRE_MODULES_BACKEND_122_FONCTIONNALITES.md §3). Les
 * routes cibles {@code /cotisations} du document sont servies ici sous {@code /paiements}, convention réelle du
 * projet depuis J4 — le frontend consomme déjà ces routes.
 */
@Tag(name = "Cotisations — paiements", description = "Saisie, contrôle, validation et suivi des cotisations")
@RestController
@RequestMapping("/api/v1/paiements")
public class ControleurPaiement {

    /** Whitelist du tri (#1) — jamais un nom de champ passé tel quel à {@link Sort}. */
    private static final Map<String, String> CHAMPS_TRI = Map.of(
            "DATE_PAIEMENT", "datePaiement",
            "MONTANT", "montant",
            "NUMERO_RECU", "numeroRecu",
            "STATUT", "statut",
            "DATE_SAISIE", "creeLe");

    private final ServicePaiement servicePaiement;
    private final ServiceAffectationPaiement serviceAffectationPaiement;
    private final ServiceBilanCaisse serviceBilanCaisse;

    public ControleurPaiement(ServicePaiement servicePaiement, ServiceAffectationPaiement serviceAffectationPaiement,
                              ServiceBilanCaisse serviceBilanCaisse) {
        this.servicePaiement = servicePaiement;
        this.serviceAffectationPaiement = serviceAffectationPaiement;
        this.serviceBilanCaisse = serviceBilanCaisse;
    }

    @Operation(summary = "Lister / rechercher les cotisations (#1 à #7, #15)",
            description = "Paginé, trié, limité au périmètre du demandeur. `statut=A_CONTROLER` donne la file à valider.")
    @GetMapping
    public ReponsePaginee<PaiementDto> journal(
            @RequestParam(required = false) UUID adherentId,
            @Parameter(description = "Matricule de l'adhérent (#3)") @RequestParam(required = false) String adherentMatricule,
            @Parameter(description = "Agent encaisseur (#4)") @RequestParam(required = false) UUID agentId,
            @Parameter(description = "Numéro de reçu ou référence de transaction (#5)") @RequestParam(required = false) String reference,
            @RequestParam(required = false) StatutPaiement statut,
            @RequestParam(required = false) String modePaiement,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDu,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateAu,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @Parameter(description = "DATE_PAIEMENT, MONTANT, NUMERO_RECU, STATUT, DATE_SAISIE")
            @RequestParam(defaultValue = "DATE_PAIEMENT") String tri,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction,
            @AuthenticationPrincipal Utilisateur demandeur) {
        if (dateDu != null && dateAu != null && dateDu.isAfter(dateAu)) {
            throw new ExceptionValidation("PAIEMENT_PERIODE_INVALIDE", "La date de début doit précéder la date de fin.", "dateDu");
        }
        String champTri = CHAMPS_TRI.get(tri.toUpperCase());
        if (champTri == null) {
            throw new ExceptionValidation("PAIEMENT_TRI_INVALIDE",
                    "Champ de tri inconnu : " + tri + ". Valeurs autorisées : " + CHAMPS_TRI.keySet(), "tri");
        }
        var critere = new CritereJournalPaiement(adherentId, statut, modePaiement, dateDu, dateAu, agentId,
                adherentMatricule, reference);
        int tailleBornee = Math.max(1, Math.min(taille, 200));
        return servicePaiement.journal(critere,
                PageRequest.of(Math.max(page, 0), tailleBornee, Sort.by(direction, champTri).and(Sort.by("id"))),
                demandeur);
    }

    @Operation(summary = "Enregistrer une cotisation (#9 à #12, #35)",
            description = "En-tête `Idempotency-Key` obligatoire : une clé déjà vue renvoie le paiement existant (200). "
                    + "`brouillon=true` crée une saisie préparatoire à soumettre ensuite (#14).")
    @PostMapping
    public ResponseEntity<PaiementDto> enregistrer(@Valid @RequestBody EnregistrementPaiementDto dto,
                                                     @RequestHeader(value = "Idempotency-Key", required = false) String cleIdempotence,
                                                     @RequestParam(defaultValue = "false") boolean brouillon,
                                                     @AuthenticationPrincipal Utilisateur auteur) {
        if (cleIdempotence == null || cleIdempotence.isBlank()) {
            // docs/03_SPECIFICATIONS_API.md §1 : en-tête obligatoire sur POST /paiements.
            throw new ExceptionValidation("IDEMPOTENCY_KEY_MANQUANTE", "L'en-tête Idempotency-Key est obligatoire.");
        }
        ResultatEnregistrementPaiement resultat = servicePaiement.enregistrer(dto, cleIdempotence, auteur, brouillon);
        if (resultat.dejaExistant()) {
            return ResponseEntity.ok(resultat.paiement());
        }
        URI localisation = ServletUriComponentsBuilder.fromCurrentRequest().replaceQuery(null).path("/{id}")
                .buildAndExpand(resultat.paiement().id()).toUri();
        return ResponseEntity.created(localisation).body(resultat.paiement());
    }

    @Operation(summary = "Contrôler un doublon avant saisie (#13)")
    @PostMapping("/verifier-doublon")
    public ResultatDoublonPaiementDto verifierDoublon(@Valid @RequestBody VerifierDoublonPaiementDto dto,
                                                      @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePaiement.verifierDoublon(dto, demandeur);
    }

    @Operation(summary = "Statistiques quotidiennes (#27)", description = "Nombre et montants par statut et par mode.")
    @GetMapping("/statistiques/quotidiennes")
    public StatistiquesQuotidiennesDto statistiquesQuotidiennes(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePaiement.statistiquesQuotidiennes(date, demandeur);
    }

    @Operation(summary = "Bilan journalier numérique (#29)",
            description = "Total enregistré de la journée et montant numérique à comparer à la caisse physique.")
    @GetMapping("/bilan-journalier")
    public BilanJournalierDto bilanJournalier(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceBilanCaisse.bilanJournalier(date, demandeur);
    }

    @Operation(summary = "Consulter le détail d'une cotisation (#8)")
    @GetMapping("/{id}")
    public PaiementDto consulter(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePaiement.consulter(id, demandeur);
    }

    @Operation(summary = "Soumettre un brouillon à validation (#14)")
    @PostMapping("/{id}/soumettre")
    public PaiementDto soumettre(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur auteur) {
        return servicePaiement.soumettre(id, auteur);
    }

    @Operation(summary = "Valider une cotisation (#16)", description = "Jamais par l'auteur de la saisie.")
    @PostMapping("/{id}/valider")
    public PaiementDto valider(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur validateur) {
        return servicePaiement.valider(id, validateur);
    }

    @Operation(summary = "Rejeter une cotisation (#17)", description = "Définitif, motif obligatoire.")
    @PostMapping("/{id}/rejeter")
    public PaiementDto rejeter(@PathVariable UUID id, @Valid @RequestBody RejeterPaiementDto dto,
                               @AuthenticationPrincipal Utilisateur validateur) {
        return servicePaiement.rejeter(id, dto.motif(), validateur);
    }

    @Operation(summary = "Historique des statuts (#18)")
    @GetMapping("/{id}/historique-statuts")
    public List<HistoriqueStatutPaiementDto> historiqueStatuts(@PathVariable UUID id,
                                                               @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePaiement.historiqueStatuts(id, demandeur);
    }

    @Operation(summary = "Corriger une cotisation (#19)",
            description = "Brouillon : modifiable par son auteur. Soumis : correction autorisée, motif obligatoire.")
    @PostMapping("/{id}/corriger")
    public PaiementDto corriger(@PathVariable UUID id, @RequestBody CorrectionPaiementDto dto,
                                 @AuthenticationPrincipal Utilisateur auteur) {
        return servicePaiement.corriger(id, dto, auteur);
    }

    @Operation(summary = "Annuler une cotisation", description = "Motif obligatoire.")
    @PostMapping("/{id}/annuler")
    public ResponseEntity<Void> annuler(@PathVariable UUID id, @Valid @RequestBody AnnulerPaiementDto dto,
                                         @AuthenticationPrincipal Utilisateur auteur) {
        servicePaiement.annuler(id, dto, auteur);
        return ResponseEntity.noContent().build();
    }

    /**
     * Motif facultatif passé en paramètre de requête (jamais en corps JSON) : contrairement à
     * {@code corriger}/{@code annuler}/{@code signaler-incoherence}, ce motif n'est jamais obligatoire, et un
     * corps de requête optionnel obligerait le client à fournir un {@code Content-Type} JSON même lorsqu'il n'a
     * rien à transmettre.
     */
    @Operation(summary = "Confirmation hiérarchique par le Chef des agents de terrain")
    @PostMapping("/{id}/confirmer-chef")
    public PaiementDto confirmerChef(@PathVariable UUID id, @RequestParam(required = false) String motif,
                                      @AuthenticationPrincipal Utilisateur chef) {
        return servicePaiement.confirmerParChef(id, motif, chef);
    }

    @Operation(summary = "Signaler une incohérence (DAF)")
    @PostMapping("/{id}/signaler-incoherence")
    public PaiementDto signalerIncoherence(@PathVariable UUID id, @Valid @RequestBody SignalerIncoherenceDto dto,
                                            @AuthenticationPrincipal Utilisateur daf) {
        return servicePaiement.signalerIncoherence(id, dto.motif(), daf);
    }

    @Operation(summary = "Reçu d'une cotisation")
    @GetMapping("/{id}/recu")
    public RecuDto recu(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePaiement.genererRecu(id, demandeur);
    }

    @Operation(summary = "Affectations d'une cotisation")
    @GetMapping("/{id}/affectations")
    public List<AffectationDto> affectations(@PathVariable UUID id) {
        return serviceAffectationPaiement.lister(id);
    }

    @Operation(summary = "Affecter manuellement une cotisation")
    @PostMapping("/{id}/affectations")
    public List<AffectationDto> affecter(@PathVariable UUID id, @Valid @RequestBody AffecterManuelDto dto,
                                          @AuthenticationPrincipal Utilisateur auteur) {
        return serviceAffectationPaiement.affecterManuellement(id, dto.lignes(), auteur);
    }
}
