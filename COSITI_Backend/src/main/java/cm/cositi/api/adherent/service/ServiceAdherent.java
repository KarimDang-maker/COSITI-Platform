package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.dto.AdherentDetailDto;
import cm.cositi.api.adherent.dto.AdhesionDto;
import cm.cositi.api.adherent.dto.CompleterProfilAdherentDto;
import cm.cositi.api.adherent.dto.CompletionAdherentDto;
import cm.cositi.api.adherent.dto.CoordonneesAdherentDto;
import cm.cositi.api.adherent.dto.CreationAdherentDto;
import cm.cositi.api.adherent.dto.CritereRechercheAdherent;
import cm.cositi.api.adherent.dto.DossierAdherentDto;
import cm.cositi.api.adherent.dto.ModificationAdherentDto;
import cm.cositi.api.adherent.dto.ModifierCoordonneesDto;
import cm.cositi.api.adherent.dto.ModifierProfessionnelDto;
import cm.cositi.api.adherent.dto.ProfilProfessionnelDto;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.audit.AuditLigneDto;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.document.entite.TypeDocument;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ServiceAdherent {

    AdherentDetailDto creer(CreationAdherentDto dto, Utilisateur auteur);

    AdherentDetailDto consulter(UUID id, Utilisateur demandeur);

    /** #3 — recherche exacte par matricule (repository déjà existant, route ajoutée ici). */
    AdherentDetailDto consulterParMatricule(String matricule, Utilisateur demandeur);

    AdherentDetailDto modifier(UUID id, ModificationAdherentDto dto, Utilisateur auteur);

    ReponsePaginee<cm.cositi.api.adherent.dto.AdherentResumeDto> rechercher(
            CritereRechercheAdherent critere, Pageable pageable, Utilisateur demandeur);

    void archiver(UUID id, String motif, Utilisateur auteur);

    void changerStatut(UUID id, StatutAdherent nouveau, String motif, Utilisateur auteur);

    AdhesionDto changerPack(UUID id, UUID packId, LocalDate effetLe, Utilisateur auteur);

    /** #14 */
    CompletionAdherentDto completion(UUID id, Utilisateur demandeur);

    /** #16 */
    AdherentDetailDto completerProfil(UUID id, CompleterProfilAdherentDto dto, Utilisateur auteur);

    /** #17 */
    DossierAdherentDto dossier(UUID id, Utilisateur demandeur);

    /** #18 */
    List<TypeDocument> documentsManquants(UUID id, Utilisateur demandeur);

    /** #21 */
    List<AuditLigneDto> historique(UUID id, Utilisateur demandeur);

    /** #29 */
    ProfilProfessionnelDto professionnel(UUID id, Utilisateur demandeur);

    /** #30 */
    AdherentDetailDto modifierProfessionnel(UUID id, ModifierProfessionnelDto dto, Utilisateur auteur);

    /** #31 */
    CoordonneesAdherentDto coordonnees(UUID id, Utilisateur demandeur);

    /** #32 */
    AdherentDetailDto modifierCoordonnees(UUID id, ModifierCoordonneesDto dto, Utilisateur auteur);
}
