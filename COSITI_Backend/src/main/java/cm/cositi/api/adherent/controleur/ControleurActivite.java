package cm.cositi.api.adherent.controleur;

import cm.cositi.api.adherent.dto.ActiviteDto;
import cm.cositi.api.adherent.repository.ActiviteRepository;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Référentiel des activités, en lecture seule.
 *
 * <p>Ajouté au jalon J12 : {@code CreationAdherentDto.activiteId} est un UUID obligatoire, mais
 * aucun endpoint ne permettait de connaître les identifiants disponibles. L'écran de création
 * demandait donc un « code d'activité » en texte libre que l'API refusait systématiquement
 * (« Format invalide pour le champ activiteId ») : <b>aucun adhérent ne pouvait être enregistré
 * par l'interface</b>. Les tests d'écran ne pouvaient pas le voir, l'API y étant simulée ; la
 * recette E2E, qui parle à la vraie API, l'a révélé.</p>
 *
 * <p>Aucune règle métier n'est introduite ici : les sept activités sont celles que la COSITI a
 * fournies et que la migration V2 insère. La table n'est ni créée ni modifiée par l'application,
 * d'où l'absence de toute écriture sur cette ressource.</p>
 */
@RestController
@RequestMapping("/api/v1/activites")
public class ControleurActivite {

    private final ActiviteRepository activiteRepository;

    public ControleurActivite(ActiviteRepository activiteRepository) {
        this.activiteRepository = activiteRepository;
    }

    /**
     * Liste complète, triée par libellé. Pas de pagination : le référentiel compte sept lignes et
     * alimente un sélecteur — paginer obligerait l'écran à charger des pages pour afficher un menu.
     */
    @GetMapping
    public List<ActiviteDto> lister() {
        return activiteRepository.findAll(Sort.by("libelle")).stream()
                .map(a -> new ActiviteDto(a.getId(), a.getCode(), a.getLibelle(), a.getCategorie()))
                .toList();
    }
}
