package cm.cositi.api.historique;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.historique.dto.CritereHistorique;
import cm.cositi.api.historique.dto.EvenementHistoriqueDto;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Sort;

import java.util.UUID;

/**
 * Historique général et historique financier du dossier adhérent (règles module 3, prompt §13 à §16), paginés et
 * filtrés côté serveur. Lecture seule, dérivée du journal d'audit — la même source que l'audit global, sans en
 * exposer les opérations techniques.
 */
public interface ServiceHistoriqueAdherent {

    /**
     * @throws cm.cositi.api.commun.exception.ExceptionAutorisation adhérent hors périmètre, ou historique financier
     *                                                             demandé sans permission de lecture financière
     */
    ReponsePaginee<EvenementHistoriqueDto> historique(UUID adherentId, CategorieHistorique categorie,
                                                      CritereHistorique critere, int page, int taille,
                                                      Sort.Direction direction, Utilisateur demandeur);

    /** Nombre d'événements visibles par ce lecteur, sans filtre (vue dossier). -1 si l'historique lui est fermé. */
    long compter(UUID adherentId, CategorieHistorique categorie, Utilisateur demandeur);
}
