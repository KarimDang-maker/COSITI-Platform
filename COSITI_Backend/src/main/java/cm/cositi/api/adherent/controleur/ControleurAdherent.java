package cm.cositi.api.adherent.controleur;

import cm.cositi.api.adherent.dto.AdherentDetailDto;
import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.adherent.dto.AdhesionDto;
import cm.cositi.api.adherent.dto.ArchiverDto;
import cm.cositi.api.adherent.dto.CandidatsDoublonDto;
import cm.cositi.api.adherent.dto.ChangerPackDto;
import cm.cositi.api.adherent.dto.ChampManquantDto;
import cm.cositi.api.adherent.dto.ChangerStatutDto;
import cm.cositi.api.adherent.dto.CompleterProfilAdherentDto;
import cm.cositi.api.adherent.dto.CompletionAdherentDto;
import cm.cositi.api.adherent.dto.CoordonneesAdherentDto;
import cm.cositi.api.adherent.dto.CreationAdherentDto;
import cm.cositi.api.adherent.dto.CritereRechercheAdherent;
import cm.cositi.api.adherent.dto.DossierAdherentDto;
import cm.cositi.api.adherent.dto.ModificationAdherentDto;
import cm.cositi.api.adherent.dto.ModifierCoordonneesDto;
import cm.cositi.api.adherent.dto.ModifierProfessionnelDto;
import cm.cositi.api.adherent.dto.ProfilProfessionnelDto;
import cm.cositi.api.adherent.dto.ResumeCotisationsAdherentDto;
import cm.cositi.api.adherent.dto.VerifierDoublonDto;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.exception.ExceptionDoublonPotentiel;
import cm.cositi.api.adherent.service.CritereDoublon;
import cm.cositi.api.adherent.service.ServiceAdherent;
import cm.cositi.api.adherent.service.ServiceDoublonAdherent;
import cm.cositi.api.audit.AuditLigneDto;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponseErreur;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.CritereJournalPaiement;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.cotisation.entite.StatutPaiement;
import cm.cositi.api.cotisation.service.ServicePaiement;
import cm.cositi.api.document.entite.TypeDocument;
import cm.cositi.api.droits.dto.SituationDroitsDto;
import cm.cositi.api.droits.service.ServiceCalculDroits;
import cm.cositi.api.organisation.dto.AgentDto;
import cm.cositi.api.organisation.service.ServicePortefeuille;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/adherents")
public class ControleurAdherent {

    /** Whitelist du tri (#8) — jamais un nom de champ passé tel quel à {@link Sort}. */
    private static final Map<String, String> CHAMPS_TRI = Map.of(
            "NOM", "nom",
            "MATRICULE", "matricule",
            "DATE_ADHESION", "dateAdhesion",
            "STATUT", "statut");

    private final ServiceAdherent serviceAdherent;
    private final ServiceDoublonAdherent serviceDoublonAdherent;
    private final ServicePortefeuille servicePortefeuille;
    private final ServiceCalculDroits serviceCalculDroits;
    private final ServicePaiement servicePaiement;

    public ControleurAdherent(ServiceAdherent serviceAdherent, ServiceDoublonAdherent serviceDoublonAdherent,
                               ServicePortefeuille servicePortefeuille, ServiceCalculDroits serviceCalculDroits,
                               ServicePaiement servicePaiement) {
        this.serviceAdherent = serviceAdherent;
        this.serviceDoublonAdherent = serviceDoublonAdherent;
        this.servicePortefeuille = servicePortefeuille;
        this.serviceCalculDroits = serviceCalculDroits;
        this.servicePaiement = servicePaiement;
    }

    @GetMapping
    public ReponsePaginee<AdherentResumeDto> lister(
            @RequestParam(required = false) String recherche,
            @RequestParam(required = false) UUID zoneId,
            @RequestParam(required = false) UUID activiteId,
            @RequestParam(required = false) StatutAdherent statut,
            @RequestParam(required = false) UUID packId,
            @RequestParam(required = false) UUID associationId,
            @RequestParam(required = false) LocalDate dateAdhesionDu,
            @RequestParam(required = false) LocalDate dateAdhesionAu,
            @RequestParam(required = false) String telephone,
            @RequestParam(required = false) UUID agentId,
            @RequestParam(required = false) Integer completionMin,
            @RequestParam(required = false) Integer completionMax,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @RequestParam(defaultValue = "NOM") String tri,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction,
            @AuthenticationPrincipal Utilisateur demandeur) {
        var critere = new CritereRechercheAdherent(recherche, zoneId, activiteId, statut, packId, associationId,
                null, dateAdhesionDu, dateAdhesionAu, telephone, agentId, completionMin, completionMax);
        int tailleBornee = Math.min(taille, 200);
        String champTri = CHAMPS_TRI.get(tri.toUpperCase());
        if (champTri == null) {
            throw new ExceptionValidation("ADHERENT_TRI_INVALIDE",
                    "Champ de tri inconnu : " + tri + ". Valeurs autorisées : " + CHAMPS_TRI.keySet(), "tri");
        }
        return serviceAdherent.rechercher(critere,
                PageRequest.of(page, tailleBornee, Sort.by(direction, champTri)), demandeur);
    }

    @PostMapping
    public ResponseEntity<AdherentDetailDto> creer(@Valid @RequestBody CreationAdherentDto dto,
                                                     @AuthenticationPrincipal Utilisateur auteur) {
        AdherentDetailDto cree = serviceAdherent.creer(dto, auteur);
        URI localisation = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(cree.id()).toUri();
        return ResponseEntity.created(localisation).body(cree);
    }

    @PostMapping("/verifier-doublon")
    public ResponseEntity<CandidatsDoublonDto> verifierDoublon(@Valid @RequestBody VerifierDoublonDto dto) {
        var candidats = serviceDoublonAdherent.rechercher(
                new CritereDoublon(dto.telephonePrincipal(), dto.numeroCni(), dto.nomComplet(), dto.zoneId()));
        return ResponseEntity.ok(new CandidatsDoublonDto(candidats));
    }

    /** #3 — recherche exacte par matricule. Route dédiée : {@code /{id}} attend un UUID. */
    @GetMapping("/matricule/{matricule}")
    public ResponseEntity<AdherentDetailDto> consulterParMatricule(@PathVariable String matricule,
                                                                    @AuthenticationPrincipal Utilisateur demandeur) {
        return ResponseEntity.ok(serviceAdherent.consulterParMatricule(matricule, demandeur));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdherentDetailDto> consulter(@PathVariable UUID id,
                                                        @AuthenticationPrincipal Utilisateur demandeur) {
        return ResponseEntity.ok(serviceAdherent.consulter(id, demandeur));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdherentDetailDto> modifier(@PathVariable UUID id,
                                                       @Valid @RequestBody ModificationAdherentDto dto,
                                                       @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.ok(serviceAdherent.modifier(id, dto, auteur));
    }

    @PostMapping("/{id}/archiver")
    public ResponseEntity<Void> archiver(@PathVariable UUID id, @Valid @RequestBody ArchiverDto dto,
                                          @AuthenticationPrincipal Utilisateur auteur) {
        serviceAdherent.archiver(id, dto.motif(), auteur);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/statut")
    public ResponseEntity<Void> changerStatut(@PathVariable UUID id, @Valid @RequestBody ChangerStatutDto dto,
                                               @AuthenticationPrincipal Utilisateur auteur) {
        serviceAdherent.changerStatut(id, dto.statut(), dto.motif(), auteur);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/pack")
    public ResponseEntity<AdhesionDto> changerPack(@PathVariable UUID id, @Valid @RequestBody ChangerPackDto dto,
                                                    @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.ok(serviceAdherent.changerPack(id, dto.packId(), dto.effetLe(), auteur));
    }

    /** #14 */
    @GetMapping("/{id}/completion")
    public CompletionAdherentDto completion(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceAdherent.completion(id, demandeur);
    }

    /** #15 — dérivé de {@link #completion} : même formule, jamais recalculée deux fois. */
    @GetMapping("/{id}/champs-manquants")
    public List<ChampManquantDto> champsManquants(@PathVariable UUID id,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceAdherent.completion(id, demandeur).champsManquants();
    }

    /** #16 */
    @PatchMapping("/{id}/profil")
    public AdherentDetailDto completerProfil(@PathVariable UUID id,
                                              @Valid @RequestBody CompleterProfilAdherentDto dto,
                                              @AuthenticationPrincipal Utilisateur auteur) {
        return serviceAdherent.completerProfil(id, dto, auteur);
    }

    /** #17 */
    @GetMapping("/{id}/dossier")
    public DossierAdherentDto dossier(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceAdherent.dossier(id, demandeur);
    }

    /** #18 */
    @GetMapping("/{id}/documents-manquants")
    public List<TypeDocument> documentsManquants(@PathVariable UUID id,
                                                  @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceAdherent.documentsManquants(id, demandeur);
    }

    /** #21 */
    @GetMapping("/{id}/historique")
    public List<AuditLigneDto> historique(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceAdherent.historique(id, demandeur);
    }

    /** #22 */
    @GetMapping("/{id}/agent")
    public AgentDto agentResponsable(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePortefeuille.agentActuel(id, demandeur);
    }

    /**
     * #28 — composition en lecture seule de {@code ServiceCalculDroits.situation} (cumul validé, solde,
     * éligibilité — formule inchangée) et du journal des paiements (montant en attente). Aucun nouveau
     * calcul financier : uniquement une agrégation de lectures déjà exposées ailleurs.
     */
    @GetMapping("/{id}/resume-cotisations")
    public ResumeCotisationsAdherentDto resumeCotisations(@PathVariable UUID id,
                                                           @AuthenticationPrincipal Utilisateur demandeur) {
        SituationDroitsDto situation = serviceCalculDroits.situation(id, LocalDate.now(), demandeur);

        var critere = new CritereJournalPaiement(id, null, null, null, null);
        ReponsePaginee<PaiementDto> paiements = servicePaiement.journal(critere,
                PageRequest.of(0, 200, Sort.by(Sort.Direction.DESC, "datePaiement")), demandeur);
        BigDecimal montantEnAttente = paiements.contenu().stream()
                .filter(p -> p.statut() == StatutPaiement.A_CONTROLER || p.statut() == StatutPaiement.INCOHERENCE)
                .map(PaiementDto::montant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // situation.soldeAvantSeuil() = max(seuil - cumul, 0) : exact tant que le seuil n'est pas atteint
        // (aucun clampage), donc « seuil = solde + cumul » ne vaut que dans ce cas — une fois éligible, le
        // solde est clampé à zéro et ce recalcul sous-estimerait le vrai seuil du pack. On l'expose donc
        // seulement tant que le seuil n'est pas atteint, jamais un chiffre financier approximatif présenté
        // comme exact (AGENTS.md règle absolue n°9).
        BigDecimal seuilReconstitue = situation.cumulCotise().add(situation.soldeAvantSeuil());
        BigDecimal pourcentage;
        if (situation.eligibleCnps()) {
            pourcentage = BigDecimal.valueOf(100);
        } else if (seuilReconstitue.signum() > 0) {
            pourcentage = situation.cumulCotise().multiply(BigDecimal.valueOf(100))
                    .divide(seuilReconstitue, 0, java.math.RoundingMode.HALF_UP);
        } else {
            pourcentage = null;
        }

        return new ResumeCotisationsAdherentDto(id, situation.cumulCotise(), montantEnAttente,
                situation.eligibleCnps() ? null : seuilReconstitue, situation.soldeAvantSeuil(),
                pourcentage, situation.eligibleCnps(), situation.couvertJusquAu(), situation.avertissements());
    }

    /** #29 */
    @GetMapping("/{id}/professionnel")
    public ProfilProfessionnelDto professionnel(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceAdherent.professionnel(id, demandeur);
    }

    /** #30 */
    @PutMapping("/{id}/professionnel")
    public AdherentDetailDto modifierProfessionnel(@PathVariable UUID id,
                                                    @Valid @RequestBody ModifierProfessionnelDto dto,
                                                    @AuthenticationPrincipal Utilisateur auteur) {
        return serviceAdherent.modifierProfessionnel(id, dto, auteur);
    }

    /** #31 */
    @GetMapping("/{id}/coordonnees")
    public CoordonneesAdherentDto coordonnees(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceAdherent.coordonnees(id, demandeur);
    }

    /** #32 */
    @PutMapping("/{id}/coordonnees")
    public AdherentDetailDto modifierCoordonnees(@PathVariable UUID id,
                                                  @Valid @RequestBody ModifierCoordonneesDto dto,
                                                  @AuthenticationPrincipal Utilisateur auteur) {
        return serviceAdherent.modifierCoordonnees(id, dto, auteur);
    }

    @ExceptionHandler(ExceptionDoublonPotentiel.class)
    public ResponseEntity<Map<String, Object>> gererDoublon(ExceptionDoublonPotentiel ex, HttpServletRequest requete) {
        ReponseErreur base = new ReponseErreur(409, ex.getCode(), ex.getMessage(), null,
                java.util.UUID.randomUUID().toString());
        return ResponseEntity.status(409).body(Map.of(
                "horodatage", base.horodatage(),
                "statut", base.statut(),
                "code", base.code(),
                "message", base.message(),
                "traceId", base.traceId(),
                "candidats", ex.getCandidats()
        ));
    }
}
