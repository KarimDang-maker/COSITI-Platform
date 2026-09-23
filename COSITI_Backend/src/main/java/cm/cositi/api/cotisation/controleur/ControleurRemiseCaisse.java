package cm.cositi.api.cotisation.controleur;

import cm.cositi.api.cotisation.dto.DeclarerRemiseCaisseDto;
import cm.cositi.api.cotisation.dto.ReceptionnerRemiseCaisseDto;
import cm.cositi.api.cotisation.dto.RemiseCaisseDto;
import cm.cositi.api.cotisation.service.ServiceRemiseCaisse;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
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

    @PostMapping("/{id}/receptionner")
    public RemiseCaisseDto receptionner(@PathVariable UUID id, @Valid @RequestBody ReceptionnerRemiseCaisseDto dto,
                                         @AuthenticationPrincipal Utilisateur receveur) {
        return serviceRemiseCaisse.receptionner(id, dto.montantRecu(), receveur);
    }
}
