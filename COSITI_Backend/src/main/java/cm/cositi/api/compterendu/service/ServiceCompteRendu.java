package cm.cositi.api.compterendu.service;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.compterendu.dto.CompteRenduDto;
import cm.cositi.api.compterendu.dto.ConsolidationDto;
import cm.cositi.api.compterendu.dto.CreationCompteRenduDto;
import cm.cositi.api.compterendu.entite.StatutCompteRendu;
import cm.cositi.api.compterendu.entite.TypeCompteRendu;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Chaîne hiérarchique Agent → Gestionnaire des comptes → DGA
 * (docs/02_CLASSES_ET_METHODES.md §3, Roles des acteurs.md §12.1, jalon J8).
 *
 * <p><b>Contrat {@code [A]}</b> : non confirmé par la COSITI au moment du codage. Implémenté et documenté
 * dans {@code V10__comptes_rendus_j8.sql} et {@code Conception/SUIVI_EXECUTION.md}, à faire valider —
 * même traitement qu'en J3 pour l'ajout d'agent et la désignation du Chef.</p>
 *
 * <p>Écart assumé avec la signature du pack : {@code produire} y crée et transmet en une fois. Ici, produire
 * crée un <b>brouillon</b> et {@code transmettre} l'envoie au Gestionnaire. Un agent doit pouvoir relire son
 * compte rendu avant de l'envoyer ; une fois transmis, il n'est plus modifiable.</p>
 */
public interface ServiceCompteRendu {

    /** Crée un compte rendu terrain en brouillon, rattaché à l'agent de l'auteur. */
    CompteRenduDto produire(CreationCompteRenduDto dto, Utilisateur agent);

    CompteRenduDto modifier(UUID compteRenduId, CreationCompteRenduDto dto, Utilisateur auteur);

    /** Envoie un brouillon à son destinataire : le Gestionnaire pour un TERRAIN, la DGA pour un CONSOLIDE. */
    CompteRenduDto transmettre(UUID compteRenduId, Utilisateur auteur);

    /** Contrôle par le Gestionnaire des comptes (UC-GC-13). */
    CompteRenduDto controler(UUID compteRenduId, String observation, Utilisateur gestionnaire);

    /** Agrège des comptes rendus terrain contrôlés en un consolidé destiné à la DGA (UC-GC-14). */
    CompteRenduDto consolider(ConsolidationDto dto, Utilisateur gestionnaire);

    CompteRenduDto consulter(UUID compteRenduId, Utilisateur demandeur);

    /**
     * Comptes rendus visibles par le demandeur. Sans filtre, chacun voit ce qui le concerne : ses propres
     * comptes rendus s'il en produit, ceux qui lui sont adressés s'il en reçoit.
     */
    ReponsePaginee<CompteRenduDto> lister(TypeCompteRendu type, StatutCompteRendu statut, boolean recus,
                                           Pageable pageable, Utilisateur demandeur);
}
