package cm.cositi.api.daf.service;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.daf.dto.ProductionRapportDto;
import cm.cositi.api.daf.dto.RapportDafDto;
import cm.cositi.api.daf.entite.StatutRapportDaf;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Flux DAF -> PCA (Roles des acteurs.md §12.3, jalon J10).
 *
 * <p>Contrat marqué {@code [A]} dans `Roles des acteurs.md §14` : implémenté et documenté dans
 * {@code V12__rapports_daf_exports_j10.sql}, à faire valider formellement par la COSITI.</p>
 */
public interface ServiceRapportDaf {

    /** UC-DAF-09 : produit un rapport dont les chiffres sont constatés puis figés. */
    RapportDafDto produire(ProductionRapportDto dto, Utilisateur daf);

    /** UC-DAF-10 : met le rapport à disposition du PCA et l'en informe. */
    RapportDafDto transmettreAuPca(UUID rapportId, Utilisateur daf);

    /** UC-PCA-07 : consultation. Un rapport non transmis n'est visible que de son auteur. */
    RapportDafDto consulter(UUID rapportId, Utilisateur demandeur);

    ReponsePaginee<RapportDafDto> lister(StatutRapportDaf statut, Pageable pageable, Utilisateur demandeur);
}
