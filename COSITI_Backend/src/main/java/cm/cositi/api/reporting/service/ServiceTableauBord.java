package cm.cositi.api.reporting.service;

import cm.cositi.api.reporting.dto.CritereTableauBord;
import cm.cositi.api.reporting.dto.TableauBordDafDto;
import cm.cositi.api.reporting.dto.TableauBordDgDto;
import cm.cositi.api.reporting.dto.TableauBordDgaDto;
import cm.cositi.api.reporting.dto.TableauBordGestionnaireDto;
import cm.cositi.api.reporting.dto.TableauBordPcaDto;
import cm.cositi.api.reporting.dto.TableauBordSuperAdminDto;
import cm.cositi.api.securite.entite.Utilisateur;

/**
 * docs/02_CLASSES_ET_METHODES.md §8 — Six dashboards <b>exclusivement</b> (jalon J9).
 *
 * <p>Le Chef des agents de terrain et l'Agent de terrain n'ont pas de tableau de bord dédié
 * (Roles des acteurs.md §16, hors périmètre V1) : ne jamais ajouter de méthode pour eux.</p>
 */
public interface ServiceTableauBord {

    TableauBordPcaDto pca(CritereTableauBord critere, Utilisateur demandeur);

    TableauBordDgDto dg(CritereTableauBord critere, Utilisateur demandeur);

    TableauBordDgaDto dga(CritereTableauBord critere, Utilisateur demandeur);

    TableauBordDafDto daf(CritereTableauBord critere, Utilisateur demandeur);

    TableauBordGestionnaireDto gestionnaire(CritereTableauBord critere, Utilisateur demandeur);

    TableauBordSuperAdminDto superAdmin(CritereTableauBord critere, Utilisateur demandeur);

    /**
     * Rafraîchit les vues matérialisées de synthèse.
     *
     * <p>Les dashboards lisent ces vues plutôt que d'agréger l'ensemble des paiements à chaque affichage
     * (docs/02_CLASSES_ET_METHODES.md §8). Leur fraîcheur est donc celle du dernier rafraîchissement, que
     * chaque réponse indique par un avertissement quand il date.</p>
     */
    void rafraichirVuesSyntheses();
}
