package cm.cositi.api.adherent.controleur;

import cm.cositi.api.adherent.dto.AdherentDetailDto;
import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.adherent.dto.ArchiverDto;
import cm.cositi.api.adherent.dto.CandidatsDoublonDto;
import cm.cositi.api.adherent.dto.ChangerStatutDto;
import cm.cositi.api.adherent.dto.CompteAdherentDto;
import cm.cositi.api.adherent.dto.CreationAdherentDto;
import cm.cositi.api.adherent.dto.CritereRechercheAdherent;
import cm.cositi.api.adherent.dto.DecisionChangementAllocationDto;
import cm.cositi.api.adherent.dto.DemandeChangementAllocationDto;
import cm.cositi.api.adherent.dto.FinalisationAdherentDto;
import cm.cositi.api.adherent.dto.ModificationAdherentDto;
import cm.cositi.api.adherent.dto.PreinscriptionAdherentDto;
import cm.cositi.api.adherent.dto.PropositionChangementAllocationDto;
import cm.cositi.api.adherent.dto.VerifierDoublonDto;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.exception.ExceptionDoublonPotentiel;
import cm.cositi.api.adherent.service.CritereDoublon;
import cm.cositi.api.adherent.service.ServiceAdherent;
import cm.cositi.api.adherent.service.ServiceDoublonAdherent;
import cm.cositi.api.commun.reponse.ReponseErreur;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/adherents")
public class ControleurAdherent {

    private final ServiceAdherent serviceAdherent;
    private final ServiceDoublonAdherent serviceDoublonAdherent;

    public ControleurAdherent(ServiceAdherent serviceAdherent, ServiceDoublonAdherent serviceDoublonAdherent) {
        this.serviceAdherent = serviceAdherent;
        this.serviceDoublonAdherent = serviceDoublonAdherent;
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
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @AuthenticationPrincipal Utilisateur demandeur) {
        var critere = new CritereRechercheAdherent(recherche, zoneId, activiteId, statut, packId, associationId,
                null, dateAdhesionDu, dateAdhesionAu);
        int tailleBornee = Math.min(taille, 200);
        return serviceAdherent.rechercher(critere,
                PageRequest.of(page, tailleBornee, Sort.by(Sort.Direction.ASC, "nom")), demandeur);
    }

    @PostMapping
    public ResponseEntity<AdherentDetailDto> creer(@Valid @RequestBody CreationAdherentDto dto,
                                                     @AuthenticationPrincipal Utilisateur auteur) {
        AdherentDetailDto cree = serviceAdherent.creer(dto, auteur);
        URI localisation = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(cree.id()).toUri();
        return ResponseEntity.created(localisation).body(cree);
    }

    /** Saisie préparatoire par l'Agent de terrain (§5) — jamais une création définitive. */
    @PostMapping("/preinscription")
    public ResponseEntity<AdherentDetailDto> preinscrire(@Valid @RequestBody PreinscriptionAdherentDto dto,
                                                          @AuthenticationPrincipal Utilisateur auteur) {
        AdherentDetailDto cree = serviceAdherent.preinscrire(dto, auteur);
        URI localisation = ServletUriComponentsBuilder.fromCurrentRequest().replacePath("/api/v1/adherents/{id}")
                .buildAndExpand(cree.id()).toUri();
        return ResponseEntity.created(localisation).body(cree);
    }

    /** Complète un adhérent préinscrit en dossier définitif — réservée à la Gestionnaire (§5). */
    @PostMapping("/{id}/finaliser")
    public ResponseEntity<AdherentDetailDto> finaliser(@PathVariable UUID id,
                                                        @Valid @RequestBody FinalisationAdherentDto dto,
                                                        @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.ok(serviceAdherent.finaliser(id, dto, auteur));
    }

    /** État des deux comptes métier (Sécurité Sociale/Épargne) de l'adhérent (§7). */
    @GetMapping("/{id}/comptes")
    public ResponseEntity<CompteAdherentDto> comptes(@PathVariable UUID id,
                                                       @AuthenticationPrincipal Utilisateur demandeur) {
        return ResponseEntity.ok(serviceAdherent.comptes(id, demandeur));
    }

    @PostMapping("/verifier-doublon")
    public ResponseEntity<CandidatsDoublonDto> verifierDoublon(@Valid @RequestBody VerifierDoublonDto dto) {
        var candidats = serviceDoublonAdherent.rechercher(
                new CritereDoublon(dto.telephonePrincipal(), dto.numeroCni(), dto.nomComplet(), dto.zoneId()));
        return ResponseEntity.ok(new CandidatsDoublonDto(candidats));
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

    /**
     * Changement de pack/allocation après création (RAPORT_V1.md §6.3/§9.5) — la Gestionnaire propose,
     * elle n'applique jamais elle-même ({@link #validerChangementAllocation}).
     */
    @PostMapping("/{id}/allocation-changes")
    public ResponseEntity<DemandeChangementAllocationDto> proposerChangementAllocation(
            @PathVariable UUID id, @Valid @RequestBody PropositionChangementAllocationDto dto,
            @AuthenticationPrincipal Utilisateur auteur) {
        DemandeChangementAllocationDto demande = serviceAdherent.proposerChangementAllocation(id, dto, auteur);
        URI localisation = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{cid}").buildAndExpand(demande.id()).toUri();
        return ResponseEntity.created(localisation).body(demande);
    }

    /** Approuve (applique) ou rejette une proposition de changement — réservé au DAF. */
    @PostMapping("/{id}/allocation-changes/{cid}/validate")
    public ResponseEntity<DemandeChangementAllocationDto> validerChangementAllocation(
            @PathVariable UUID id, @PathVariable UUID cid, @Valid @RequestBody DecisionChangementAllocationDto dto,
            @AuthenticationPrincipal Utilisateur daf) {
        return ResponseEntity.ok(serviceAdherent.deciderChangementAllocation(cid, dto, daf));
    }

    @GetMapping("/{id}/allocation-changes")
    public ResponseEntity<List<DemandeChangementAllocationDto>> historiqueChangementsAllocation(
            @PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return ResponseEntity.ok(serviceAdherent.historiqueChangementsAllocation(id, demandeur));
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
