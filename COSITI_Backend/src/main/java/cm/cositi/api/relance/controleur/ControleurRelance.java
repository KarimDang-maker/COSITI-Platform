package cm.cositi.api.relance.controleur;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.relance.dto.CampagneRelanceDto;
import cm.cositi.api.relance.dto.CreationCampagneDto;
import cm.cositi.api.relance.dto.CreationRelanceDto;
import cm.cositi.api.relance.dto.RelanceDto;
import cm.cositi.api.relance.entite.StatutCampagne;
import cm.cositi.api.relance.service.ServiceRelance;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** docs/03_SPECIFICATIONS_API.md §10 — Relances et campagnes (jalon J8). */
@RestController
@RequestMapping("/api/v1")
public class ControleurRelance {

    private final ServiceRelance serviceRelance;

    public ControleurRelance(ServiceRelance serviceRelance) {
        this.serviceRelance = serviceRelance;
    }

    @GetMapping("/relances")
    public ReponsePaginee<RelanceDto> lister(@RequestParam(required = false) UUID campagneId,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "25") int taille,
                                              @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceRelance.lister(campagneId, PageRequest.of(page, Math.min(taille, 200)), demandeur);
    }

    @GetMapping("/adherents/{adherentId}/relances")
    public List<RelanceDto> parAdherent(@PathVariable UUID adherentId,
                                         @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceRelance.parAdherent(adherentId, demandeur);
    }

    /**
     * Enregistre un contact et son résultat en une seule opération.
     *
     * <p>Le pack décrit {@code POST /relances} puis {@code POST /relances/{id}/resultat} en deux temps. Le
     * découpage n'est pas repris : sur le terrain, l'agent saisit le contact <b>après</b> l'avoir eu, donc
     * avec son résultat. Une relance sans résultat serait une ligne vide de sens, et le schéma le confirme —
     * {@code relance.resultat} est {@code NOT NULL} (V4). Écart signalé dans
     * {@code Conception/SUIVI_EXECUTION.md} plutôt que contourné par un résultat par défaut.</p>
     */
    @PostMapping("/relances")
    public ResponseEntity<RelanceDto> enregistrer(@Valid @RequestBody CreationRelanceDto dto,
                                                   @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.status(201).body(serviceRelance.enregistrer(dto, auteur));
    }

    @GetMapping("/campagnes-relance")
    public ReponsePaginee<CampagneRelanceDto> listerCampagnes(
            @RequestParam(required = false) StatutCampagne statut,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceRelance.listerCampagnes(statut, PageRequest.of(page, Math.min(taille, 200)), demandeur);
    }

    @PostMapping("/campagnes-relance")
    public ResponseEntity<CampagneRelanceDto> creerCampagne(@Valid @RequestBody CreationCampagneDto dto,
                                                             @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.status(201).body(serviceRelance.creerCampagne(dto, auteur));
    }

    @PostMapping("/campagnes-relance/{id}/statut")
    public CampagneRelanceDto changerStatutCampagne(@PathVariable UUID id,
                                                     @RequestParam StatutCampagne statut,
                                                     @AuthenticationPrincipal Utilisateur auteur) {
        return serviceRelance.changerStatutCampagne(id, statut, auteur);
    }
}
