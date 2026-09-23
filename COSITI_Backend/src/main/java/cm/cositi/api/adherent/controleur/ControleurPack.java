package cm.cositi.api.adherent.controleur;

import cm.cositi.api.adherent.dto.PackDto;
import cm.cositi.api.adherent.repository.PackRepository;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Référentiel des packs de cotisation, en lecture seule.
 *
 * <p>Ajouté au jalon J12, pour la même raison que {@link ControleurActivite} :
 * {@code CreationAdherentDto.packId} est un UUID obligatoire qu'aucun appel ne permettait de
 * connaître. Le formulaire de création ne comportait même pas de champ pack, et l'API refusait
 * donc toute création (« Le pack est obligatoire »).</p>
 *
 * <p>La liste est renvoyée <b>entière</b>, drapeau {@code actif} compris, plutôt que filtrée sur
 * les packs actifs : un adhérent déjà rattaché à un pack retiré du catalogue doit rester
 * affichable. C'est à l'écran de création de ne proposer que les packs actifs, et cette décision
 * reste ainsi lisible là où elle s'applique.</p>
 *
 * <p>Aucune règle métier n'est introduite : les deux packs et leurs montants viennent de la
 * COSITI et sont insérés par la migration V2. Le seuil d'éligibilité CNPS est exposé parce
 * que l'éligibilité se calcule sur le seuil du pack de l'adhérent, jamais sur un seuil global.</p>
 */
@RestController
@RequestMapping("/api/v1/packs")
public class ControleurPack {

    private final PackRepository packRepository;

    public ControleurPack(PackRepository packRepository) {
        this.packRepository = packRepository;
    }

    @GetMapping
    public List<PackDto> lister() {
        return packRepository.findAll(Sort.by("montantJournalier")).stream()
                .map(p -> new PackDto(p.getId(), p.getCode(), p.getLibelle(), p.getMontantJournalier(),
                        p.getMontantMensuelEquivalent(), p.getSeuilEligibiliteCnps(), p.isActif()))
                .toList();
    }
}
