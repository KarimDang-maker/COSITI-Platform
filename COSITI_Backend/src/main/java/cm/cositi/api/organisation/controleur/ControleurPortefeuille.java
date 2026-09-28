package cm.cositi.api.organisation.controleur;

import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.organisation.dto.AffecterPortefeuilleDto;
import cm.cositi.api.organisation.dto.TransfererPortefeuilleDto;
import cm.cositi.api.organisation.service.ServicePortefeuille;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/portefeuilles")
public class ControleurPortefeuille {

    private final ServicePortefeuille servicePortefeuille;

    public ControleurPortefeuille(ServicePortefeuille servicePortefeuille) {
        this.servicePortefeuille = servicePortefeuille;
    }

    @PostMapping("/affecter")
    public ResponseEntity<Void> affecter(@Valid @RequestBody AffecterPortefeuilleDto dto,
                                          @AuthenticationPrincipal Utilisateur auteur) {
        servicePortefeuille.affecter(dto.adherentId(), dto.agentId(), dto.motif(), auteur);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/transferer")
    public ResponseEntity<Void> transferer(@Valid @RequestBody TransfererPortefeuilleDto dto,
                                            @AuthenticationPrincipal Utilisateur auteur) {
        servicePortefeuille.transfererEnLot(dto.adherentIds(), dto.nouvelAgentId(), dto.motif(), auteur);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sans-agent")
    public List<AdherentResumeDto> sansAgent(@RequestParam UUID zoneId) {
        return servicePortefeuille.sansAgentReferent(zoneId);
    }
}
