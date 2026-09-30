package cm.cositi.api.organisation.controleur;

import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.audit.AuditLigneDto;
import cm.cositi.api.cnps.dto.AdherentEligibleCnpsDto;
import cm.cositi.api.cnps.service.ServiceDossierCnps;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.CritereJournalPaiement;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.cotisation.entite.StatutPaiement;
import cm.cositi.api.cotisation.service.ServicePaiement;
import cm.cositi.api.organisation.dto.AffectationPortefeuilleDto;
import cm.cositi.api.organisation.dto.AgentDto;
import cm.cositi.api.organisation.dto.ChangerStatutAgentDto;
import cm.cositi.api.organisation.dto.ChargeAgentDto;
import cm.cositi.api.organisation.dto.CreationAgentDto;
import cm.cositi.api.organisation.dto.CritereRechercheAgent;
import cm.cositi.api.organisation.dto.DesignerChefDto;
import cm.cositi.api.organisation.dto.DistributionPortefeuilleDto;
import cm.cositi.api.organisation.dto.HistoriqueDesignationChefDto;
import cm.cositi.api.organisation.dto.ModificationAgentDto;
import cm.cositi.api.organisation.dto.ResumeCotisationsAgentDto;
import cm.cositi.api.organisation.dto.ResumePortefeuilleDto;
import cm.cositi.api.organisation.service.ServiceAgent;
import cm.cositi.api.organisation.service.ServicePortefeuille;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agents")
public class ControleurAgent {

    /** Whitelist du tri (#1/#21) — jamais un nom de champ passé tel quel à {@link Sort}. */
    private static final Map<String, String> CHAMPS_TRI = Map.of(
            "NOM", "nomComplet",
            "CODE_AGENT", "codeAgent",
            "ZONE", "zoneId");

    private final ServiceAgent serviceAgent;
    private final ServicePortefeuille servicePortefeuille;
    private final ServiceDossierCnps serviceDossierCnps;
    private final ServicePaiement servicePaiement;

    public ControleurAgent(ServiceAgent serviceAgent, ServicePortefeuille servicePortefeuille,
                            ServiceDossierCnps serviceDossierCnps, ServicePaiement servicePaiement) {
        this.serviceAgent = serviceAgent;
        this.servicePortefeuille = servicePortefeuille;
        this.serviceDossierCnps = serviceDossierCnps;
        this.servicePaiement = servicePaiement;
    }

    /** #1, #2, #21 */
    @GetMapping
    public ReponsePaginee<AgentDto> lister(
            @RequestParam(required = false) String recherche,
            @RequestParam(required = false) Boolean actif,
            @RequestParam(required = false) UUID zoneId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @RequestParam(defaultValue = "NOM") String tri,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction,
            @AuthenticationPrincipal Utilisateur demandeur) {
        String champTri = CHAMPS_TRI.get(tri.toUpperCase());
        if (champTri == null) {
            throw new ExceptionValidation("AGENT_TRI_INVALIDE",
                    "Champ de tri inconnu : " + tri + ". Valeurs autorisées : " + CHAMPS_TRI.keySet(), "tri");
        }
        var critere = new CritereRechercheAgent(recherche, actif, zoneId);
        int tailleBornee = Math.min(taille, 200);
        return serviceAgent.lister(critere, PageRequest.of(page, tailleBornee, Sort.by(direction, champTri)), demandeur);
    }

    @GetMapping("/{id}")
    public AgentDto consulter(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceAgent.consulter(id, demandeur);
    }

    /** `POST /agents` générique — la création par la DGA (DGA-F01) est ce même endpoint, vérifié côté service. */
    @PostMapping
    public ResponseEntity<AgentDto> creer(@Valid @RequestBody CreationAgentDto dto,
                                           @AuthenticationPrincipal Utilisateur dga) {
        AgentDto cree = serviceAgent.creerParDga(dto, dga);
        URI localisation = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(cree.id()).toUri();
        return ResponseEntity.created(localisation).body(cree);
    }

    /** #5 */
    @PutMapping("/{id}")
    public AgentDto modifier(@PathVariable UUID id, @Valid @RequestBody ModificationAgentDto dto,
                              @AuthenticationPrincipal Utilisateur dga) {
        return serviceAgent.modifier(id, dto, dga);
    }

    /** #6 */
    @PostMapping("/{id}/statut")
    public AgentDto changerStatut(@PathVariable UUID id, @Valid @RequestBody ChangerStatutAgentDto dto,
                                   @AuthenticationPrincipal Utilisateur dga) {
        return serviceAgent.changerStatut(id, dto, dga);
    }

    @GetMapping("/{id}/portefeuille")
    public ReponsePaginee<AdherentResumeDto> portefeuille(@PathVariable UUID id,
                                                           @RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "25") int taille,
                                                           @AuthenticationPrincipal Utilisateur demandeur) {
        int tailleBornee = Math.min(taille, 200);
        return servicePortefeuille.portefeuille(id, PageRequest.of(page, tailleBornee), demandeur);
    }

    /** #8, #10, #11 */
    @GetMapping("/{id}/portefeuille/resume")
    public ResumePortefeuilleDto resumePortefeuille(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePortefeuille.resumePortefeuille(id, demandeur);
    }

    /** #24 */
    @GetMapping("/{id}/portefeuille/historique")
    public List<AffectationPortefeuilleDto> historiquePortefeuille(@PathVariable UUID id,
                                                                    @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePortefeuille.historiquePortefeuille(id, demandeur);
    }

    /** #13 — quota CNPS déjà atteint, restreint au portefeuille de cet agent. */
    @GetMapping("/{id}/portefeuille/cnps/eligibles")
    public List<AdherentEligibleCnpsDto> portefeuilleCnpsEligibles(@PathVariable UUID id,
                                                                    @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceDossierCnps.eligiblesNonImmatricules(null, id, demandeur);
    }

    /** #12 — proche du quota CNPS, restreint au portefeuille de cet agent. */
    @GetMapping("/{id}/portefeuille/cnps/proches-seuil")
    public List<AdherentEligibleCnpsDto> portefeuilleCnpsProchesSeuil(@PathVariable UUID id,
                                                                       @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceDossierCnps.prochesDuSeuil(null, id, demandeur);
    }

    @GetMapping("/{id}/charge")
    public ChargeAgentDto charge(@PathVariable UUID id, @RequestParam String periode) {
        return servicePortefeuille.charge(id, YearMonth.parse(periode));
    }

    /**
     * #14, #15 — composition en lecture seule du journal des paiements existant, filtré par agent et par
     * mois. Aucun nouveau calcul financier (même principe que {@code ControleurAdherent.resumeCotisations}).
     */
    @GetMapping("/{id}/cotisations-resume")
    public ResumeCotisationsAgentDto cotisationsResume(@PathVariable UUID id, @RequestParam String periode,
                                                        @AuthenticationPrincipal Utilisateur demandeur) {
        YearMonth mois = YearMonth.parse(periode);
        var critere = new CritereJournalPaiement(null, null, null, mois.atDay(1), mois.atEndOfMonth(), id);
        ReponsePaginee<PaiementDto> paiements = servicePaiement.journal(critere,
                PageRequest.of(0, 200, Sort.by(Sort.Direction.DESC, "datePaiement")), demandeur);

        BigDecimal montantValide = BigDecimal.ZERO;
        BigDecimal montantEnAttente = BigDecimal.ZERO;
        BigDecimal montantAnnule = BigDecimal.ZERO;
        for (PaiementDto p : paiements.contenu()) {
            switch (p.statut()) {
                case VALIDE, RAPPROCHE -> montantValide = montantValide.add(p.montant());
                case A_CONTROLER, INCOHERENCE -> montantEnAttente = montantEnAttente.add(p.montant());
                case ANNULE -> montantAnnule = montantAnnule.add(p.montant());
                default -> { }
            }
        }
        return new ResumeCotisationsAgentDto(id, periode, paiements.contenu().size(), montantValide,
                montantEnAttente, montantAnnule);
    }

    /** #7, #22, #23 — un seul endpoint : la dernière activité est le premier élément de cette liste triée. */
    @GetMapping("/{id}/operations")
    public List<AuditLigneDto> operations(@PathVariable UUID id,
                                           @RequestParam(required = false) Instant depuis,
                                           @RequestParam(required = false) Instant jusqua,
                                           @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceAgent.operations(id, depuis, jusqua, demandeur);
    }

    /** #19 */
    @GetMapping("/portefeuille-distribution")
    public List<DistributionPortefeuilleDto> distributionPortefeuille(@AuthenticationPrincipal Utilisateur demandeur) {
        return servicePortefeuille.distribution(demandeur);
    }

    @PostMapping("/{id}/designer-chef")
    public AgentDto designerChef(@PathVariable UUID id, @Valid @RequestBody DesignerChefDto dto,
                                  @AuthenticationPrincipal Utilisateur dga) {
        return serviceAgent.designerChef(id, dto.motif(), dga);
    }

    @PostMapping("/{id}/remplacer-chef")
    public AgentDto remplacerChef(@PathVariable UUID id, @Valid @RequestBody DesignerChefDto dto,
                                   @AuthenticationPrincipal Utilisateur dga) {
        return serviceAgent.remplacerChef(id, dto.motif(), dga);
    }

    @GetMapping("/chef")
    public AgentDto chefCourant(@RequestParam UUID zoneId) {
        return serviceAgent.chefCourant(zoneId);
    }

    @GetMapping("/{id}/historique-chef")
    public List<HistoriqueDesignationChefDto> historiqueChef(@PathVariable UUID id,
                                                              @AuthenticationPrincipal Utilisateur demandeur) {
        AgentDto agent = consulter(id, demandeur);
        return serviceAgent.historiqueChef(agent.zoneId());
    }
}
