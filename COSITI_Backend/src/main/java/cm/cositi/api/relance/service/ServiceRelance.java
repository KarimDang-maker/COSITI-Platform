package cm.cositi.api.relance.service;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.relance.dto.CampagneRelanceDto;
import cm.cositi.api.relance.dto.CreationCampagneDto;
import cm.cositi.api.relance.dto.CreationRelanceDto;
import cm.cositi.api.relance.dto.RelanceDto;
import cm.cositi.api.relance.entite.StatutCampagne;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * Relances et campagnes (jalon J8, docs/03_SPECIFICATIONS_API.md §10).
 *
 * <p>Ce service enregistre des <b>actions humaines</b> : aucun envoi automatique de SMS ou d'appel n'est
 * déclenché, aucune relance n'est planifiée par le système. Le rapprochement entre une relance et un
 * paiement ultérieur n'est pas non plus inféré — il n'existe aucune règle validée pour l'établir.</p>
 */
public interface ServiceRelance {

    RelanceDto enregistrer(CreationRelanceDto dto, Utilisateur auteur);

    List<RelanceDto> parAdherent(UUID adherentId, Utilisateur demandeur);

    ReponsePaginee<RelanceDto> lister(UUID campagneId, Pageable pageable, Utilisateur demandeur);

    CampagneRelanceDto creerCampagne(CreationCampagneDto dto, Utilisateur auteur);

    ReponsePaginee<CampagneRelanceDto> listerCampagnes(StatutCampagne statut, Pageable pageable,
                                                        Utilisateur demandeur);

    CampagneRelanceDto changerStatutCampagne(UUID campagneId, StatutCampagne statut, Utilisateur auteur);
}
