package cm.cositi.api.cotisation.controleur;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.DeclarerRemiseCaisseDto;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.cotisation.dto.ReceptionnerRemiseCaisseDto;
import cm.cositi.api.cotisation.dto.RemiseCaisseDto;
import cm.cositi.api.cotisation.service.ServiceRemiseCaisse;
import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
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
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/remises-caisse")
public class ControleurRemiseCaisse {

    private final ServiceRemiseCaisse serviceRemiseCaisse;

    public ControleurRemiseCaisse(ServiceRemiseCaisse serviceRemiseCaisse) {
        this.serviceRemiseCaisse = serviceRemiseCaisse;
    }

    @PostMapping
    public ResponseEntity<RemiseCaisseDto> declarer(@Valid @RequestBody DeclarerRemiseCaisseDto dto,
                                                     @AuthenticationPrincipal Utilisateur auteur) {
        RemiseCaisseDto cree = serviceRemiseCaisse.declarer(dto.agentId(), dto.paiementIds(), auteur);
        URI localisation = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(cree.id()).toUri();
        return ResponseEntity.created(localisation).body(cree);
    }

    @Operation(summary = "Lister les remises de caisse (DAF)",
            description = "statut : DECLAREE (à réceptionner), CLOTUREE, EN_ECART. Réservé au DAF (FINANCES:CONSULTER).")
    @GetMapping
    public ReponsePaginee<RemiseCaisseDto> lister(
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) UUID agentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille) {
        return serviceRemiseCaisse.lister(statut, agentId, page, taille);
    }

    @Operation(summary = "Cotisations d'un agent restant à remettre",
            description = "Encaissées par l'agent, ni remises, ni annulées, ni rejetées, ni en brouillon.")
    @GetMapping("/a-remettre")
    public List<PaiementDto> aRemettre(
            @RequestParam UUID agentId,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceRemiseCaisse.aRemettre(agentId, demandeur);
    }

    @GetMapping("/{id}")
    public RemiseCaisseDto consulter(@PathVariable UUID id) {
        return serviceRemiseCaisse.consulter(id);
    }

    @PostMapping("/{id}/receptionner")
    public RemiseCaisseDto receptionner(@PathVariable UUID id, @Valid @RequestBody ReceptionnerRemiseCaisseDto dto,
                                         @AuthenticationPrincipal Utilisateur receveur) {
        return serviceRemiseCaisse.receptionner(id, dto.montantRecu(), receveur);
    }
}
