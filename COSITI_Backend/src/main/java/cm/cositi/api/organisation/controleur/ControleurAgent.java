package cm.cositi.api.organisation.controleur;

import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.organisation.dto.AgentDto;
import cm.cositi.api.organisation.dto.ChargeAgentDto;
import cm.cositi.api.organisation.dto.CreationAgentDto;
import cm.cositi.api.organisation.dto.DecisionObjectifDto;
import cm.cositi.api.organisation.dto.DesignerChefDto;
import cm.cositi.api.organisation.dto.HistoriqueDesignationChefDto;
import cm.cositi.api.organisation.dto.ObjectifRecouvrementDto;
import cm.cositi.api.organisation.dto.PropositionObjectifDto;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.organisation.service.ServiceAgent;
import cm.cositi.api.organisation.service.ServiceObjectifRecouvrement;
import cm.cositi.api.organisation.service.ServicePortefeuille;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
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

import java.net.URI;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agents")
public class ControleurAgent {

    private final ServiceAgent serviceAgent;
    private final ServicePortefeuille servicePortefeuille;
    private final AgentRepository agentRepository;
    private final ServiceObjectifRecouvrement serviceObjectifRecouvrement;

    public ControleurAgent(ServiceAgent serviceAgent, ServicePortefeuille servicePortefeuille,
                            AgentRepository agentRepository,
                            ServiceObjectifRecouvrement serviceObjectifRecouvrement) {
        this.serviceAgent = serviceAgent;
        this.servicePortefeuille = servicePortefeuille;
        this.agentRepository = agentRepository;
        this.serviceObjectifRecouvrement = serviceObjectifRecouvrement;
    }

    @GetMapping
    public List<AgentDto> lister() {
        return agentRepository.findAll().stream().map(AgentDto::depuis).toList();
    }

    @GetMapping("/{id}")
    public AgentDto consulter(@PathVariable UUID id) {
        return agentRepository.findById(id).map(AgentDto::depuis)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("AGENT_INTROUVABLE", "Agent introuvable."));
    }

    /** `POST /agents` générique — la création par la DGA (DGA-F01) est ce même endpoint, vérifié côté service. */
    @PostMapping
    public ResponseEntity<AgentDto> creer(@Valid @RequestBody CreationAgentDto dto,
                                           @AuthenticationPrincipal Utilisateur dga) {
        AgentDto cree = serviceAgent.creerParDga(dto, dga);
        URI localisation = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(cree.id()).toUri();
        return ResponseEntity.created(localisation).body(cree);
    }

    @GetMapping("/{id}/portefeuille")
    public List<AdherentResumeDto> portefeuille(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePortefeuille.portefeuille(id, demandeur);
    }

    @GetMapping("/{id}/charge")
    public ChargeAgentDto charge(@PathVariable UUID id, @RequestParam String periode) {
        return servicePortefeuille.charge(id, YearMonth.parse(periode));
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
    public List<HistoriqueDesignationChefDto> historiqueChef(@PathVariable UUID id) {
        AgentDto agent = consulter(id);
        return serviceAgent.historiqueChef(agent.zoneId());
    }

    /** Proposition d'objectif de recouvrement (Gestionnaire, Chef) — RAPORT_V1.md §4.4/§6.5. */
    @PostMapping("/{id}/objectifs")
    public ResponseEntity<ObjectifRecouvrementDto> proposerObjectif(@PathVariable UUID id,
                                                                     @Valid @RequestBody PropositionObjectifDto dto,
                                                                     @AuthenticationPrincipal Utilisateur auteur) {
        ObjectifRecouvrementDto objectif = serviceObjectifRecouvrement.proposer(id, dto, auteur);
        URI localisation = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{oid}").buildAndExpand(objectif.id()).toUri();
        return ResponseEntity.created(localisation).body(objectif);
    }

    /** Approuve ou rejette une proposition — réservé à la DGA (arbitrage, §6.11). */
    @PostMapping("/{id}/objectifs/{oid}/decision")
    public ResponseEntity<ObjectifRecouvrementDto> deciderObjectif(@PathVariable UUID id, @PathVariable UUID oid,
                                                                    @Valid @RequestBody DecisionObjectifDto dto,
                                                                    @AuthenticationPrincipal Utilisateur dga) {
        return ResponseEntity.ok(serviceObjectifRecouvrement.decider(oid, dto, dga));
    }

    @GetMapping("/{id}/objectifs")
    public List<ObjectifRecouvrementDto> historiqueObjectifs(@PathVariable UUID id) {
        return serviceObjectifRecouvrement.historique(id);
    }
}
