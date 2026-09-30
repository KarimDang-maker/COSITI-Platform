package cm.cositi.api.compterendu.controleur;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.compterendu.dto.CompteRenduDto;
import cm.cositi.api.compterendu.dto.ConsolidationDto;
import cm.cositi.api.compterendu.dto.ControleCompteRenduDto;
import cm.cositi.api.compterendu.dto.CreationCompteRenduDto;
import cm.cositi.api.compterendu.entite.StatutCompteRendu;
import cm.cositi.api.compterendu.entite.TypeCompteRendu;
import cm.cositi.api.compterendu.service.ServiceCompteRendu;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
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

import java.util.UUID;

/**
 * docs/03_SPECIFICATIONS_API.md §9 — Comptes rendus (jalon J8).
 *
 * <p>Contrat marqué {@code [A]} dans le pack : implémenté ici et à faire valider formellement par la COSITI.
 * Les chemins reprennent ceux du pack ({@code /comptes-rendus}, {@code /{id}/controler},
 * {@code /consolider}, {@code /{id}/transmettre}) ; {@code PUT /{id}} est ajouté pour permettre de corriger
 * un brouillon avant transmission.</p>
 */
@RestController
@RequestMapping("/api/v1/comptes-rendus")
public class ControleurCompteRendu {

    private final ServiceCompteRendu serviceCompteRendu;

    public ControleurCompteRendu(ServiceCompteRendu serviceCompteRendu) {
        this.serviceCompteRendu = serviceCompteRendu;
    }

    @GetMapping
    public ReponsePaginee<CompteRenduDto> lister(@RequestParam(required = false) TypeCompteRendu type,
                                                  @RequestParam(required = false) StatutCompteRendu statut,
                                                  @RequestParam(defaultValue = "false") boolean recus,
                                                  @RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "25") int taille,
                                                  @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceCompteRendu.lister(type, statut, recus, PageRequest.of(page, Math.min(taille, 200)),
                demandeur);
    }

    @GetMapping("/{id}")
    public CompteRenduDto consulter(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceCompteRendu.consulter(id, demandeur);
    }

    @PostMapping
    public ResponseEntity<CompteRenduDto> produire(@Valid @RequestBody CreationCompteRenduDto dto,
                                                    @AuthenticationPrincipal Utilisateur agent) {
        return ResponseEntity.status(201).body(serviceCompteRendu.produire(dto, agent));
    }

    @PutMapping("/{id}")
    public CompteRenduDto modifier(@PathVariable UUID id, @Valid @RequestBody CreationCompteRenduDto dto,
                                    @AuthenticationPrincipal Utilisateur auteur) {
        return serviceCompteRendu.modifier(id, dto, auteur);
    }

    /**
     * Sans corps : le destinataire est déduit du type de compte rendu. Aucun {@code @RequestBody} optionnel
     * ici — même motif qu'en J5 et J7, un corps facultatif renvoyait 500 dès que le client fixait un
     * {@code Content-Type}.
     */
    @PostMapping("/{id}/transmettre")
    public CompteRenduDto transmettre(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur auteur) {
        return serviceCompteRendu.transmettre(id, auteur);
    }

    @PostMapping("/{id}/controler")
    public CompteRenduDto controler(@PathVariable UUID id,
                                     @RequestBody(required = false) ControleCompteRenduDto dto,
                                     @AuthenticationPrincipal Utilisateur gestionnaire) {
        return serviceCompteRendu.controler(id, dto == null ? null : dto.observation(), gestionnaire);
    }

    @PostMapping("/consolider")
    public ResponseEntity<CompteRenduDto> consolider(@Valid @RequestBody ConsolidationDto dto,
                                                      @AuthenticationPrincipal Utilisateur gestionnaire) {
        return ResponseEntity.status(201).body(serviceCompteRendu.consolider(dto, gestionnaire));
    }
}
