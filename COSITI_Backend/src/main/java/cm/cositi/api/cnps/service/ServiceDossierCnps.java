package cm.cositi.api.cnps.service;

import cm.cositi.api.cnps.dto.AdherentEligibleCnpsDto;
import cm.cositi.api.cnps.dto.DossierCnpsDto;
import cm.cositi.api.cnps.dto.PieceManquanteDto;
import cm.cositi.api.cnps.dto.SituationImmatriculationCnpsDto;
import cm.cositi.api.cnps.entite.StatutDossierCnps;
import cm.cositi.api.cnps.entite.TypePieceCnps;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * docs/02_CLASSES_ET_METHODES.md §6 — Module CNPS (jalon J7).
 *
 * <p><b>Écart assumé avec la signature du pack</b> : {@code piecesManquantes} et
 * {@code eligiblesNonImmatricules} y sont décrits sans {@code Utilisateur}. Le paramètre est ajouté ici
 * parce que docs/04_SECURITE.md §3 impose le filtrage par périmètre de données sur <b>toute</b> lecture,
 * unitaire comme en liste — une méthode qui ne connaît pas son demandeur ne peut pas l'appliquer. Le type
 * de pièce est de même un {@code TypePieceCnps} et non une {@code String} : le pack le décrit en texte
 * libre, la colonne a cinq valeurs connues (V4).</p>
 */
public interface ServiceDossierCnps {

    DossierCnpsDto ouvrir(UUID adherentId, Utilisateur auteur);

    DossierCnpsDto consulter(UUID dossierId, Utilisateur demandeur);

    DossierCnpsDto consulterParAdherent(UUID adherentId, Utilisateur demandeur);

    ReponsePaginee<DossierCnpsDto> lister(StatutDossierCnps statut, Pageable pageable, Utilisateur demandeur);

    DossierCnpsDto ajouterPiece(UUID dossierId, UUID documentId, TypePieceCnps typePiece, Utilisateur auteur);

    DossierCnpsDto changerStatut(UUID dossierId, StatutDossierCnps nouveau, String commentaire, Utilisateur auteur);

    List<PieceManquanteDto> piecesManquantes(UUID dossierId, Utilisateur demandeur);

    List<AdherentEligibleCnpsDto> eligiblesNonImmatricules(UUID zoneId, Utilisateur demandeur);

    /**
     * Situation face au seuil CNPS de tous les adhérents concernés — immatriculés ou non — pour l'écran
     * Immatriculations du Gestionnaire des comptes ({@code FONCTIONALITE_GestComtes_V1.md} §7-§13, 3
     * onglets). Étend {@link #eligiblesNonImmatricules} (qui exclut les adhérents déjà immatriculés) : même
     * calcul de {@code cumulCotise}/{@code seuilEligibilite}, sans le filtre d'exclusion.
     */
    List<SituationImmatriculationCnpsDto> situationsImmatriculation(UUID zoneId, Utilisateur demandeur);
}
