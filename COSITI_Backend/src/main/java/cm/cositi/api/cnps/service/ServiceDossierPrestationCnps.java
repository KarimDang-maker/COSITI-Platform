package cm.cositi.api.cnps.service;

import cm.cositi.api.cnps.dto.AjoutPiecePrestationDto;
import cm.cositi.api.cnps.dto.ChangementStatutDossierPrestationDto;
import cm.cositi.api.cnps.dto.CreationDossierPrestationDto;
import cm.cositi.api.cnps.dto.CritereRechercheDossierPrestation;
import cm.cositi.api.cnps.dto.DossierPrestationCnpsDto;
import cm.cositi.api.cnps.dto.HistoriqueDossierPrestationCnpsDto;
import cm.cositi.api.cnps.dto.OffreCnpsDto;
import cm.cositi.api.cnps.dto.PieceManquantePrestationDto;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Dossiers de prestation CNPS (allocations familiales, PVID, risques professionnels) — module Gestionnaire
 * des comptes, {@code Conception/Gestionaires de comptes/FONCTIONALITE_GestComtes_V1.md} et {@code V2.md}.
 * Distinct de {@link ServiceDossierCnps} (immatriculation).
 */
public interface ServiceDossierPrestationCnps {

    /** Référentiel des offres, éventuellement filtré par rubrique (PF/RP/PVID) — lecture seule, {@code CNPS:LIRE}. */
    List<OffreCnpsDto> listerOffres(String rubrique);

    DossierPrestationCnpsDto ouvrir(CreationDossierPrestationDto dto, Utilisateur auteur);

    DossierPrestationCnpsDto consulter(UUID dossierId, Utilisateur demandeur);

    ReponsePaginee<DossierPrestationCnpsDto> lister(CritereRechercheDossierPrestation critere, Pageable pageable,
                                                      Utilisateur demandeur);

    DossierPrestationCnpsDto ajouterPiece(UUID dossierId, AjoutPiecePrestationDto dto, Utilisateur auteur);

    DossierPrestationCnpsDto changerStatut(UUID dossierId, ChangementStatutDossierPrestationDto dto,
                                            Utilisateur auteur);

    DossierPrestationCnpsDto modifierObservations(UUID dossierId, String observations, LocalDate prochaineRelanceLe,
                                                   Utilisateur auteur);

    List<PieceManquantePrestationDto> piecesManquantes(UUID dossierId, Utilisateur demandeur);

    /** Journal d'activité scopé au dossier — jamais {@code AUDIT:CONSULTER} (voir Javadoc de l'entité). */
    List<HistoriqueDossierPrestationCnpsDto> journal(UUID dossierId, Utilisateur demandeur);
}
