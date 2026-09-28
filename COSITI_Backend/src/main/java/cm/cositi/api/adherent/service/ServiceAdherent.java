package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.dto.AdherentDetailDto;
import cm.cositi.api.adherent.dto.CompteAdherentDto;
import cm.cositi.api.adherent.dto.CreationAdherentDto;
import cm.cositi.api.adherent.dto.CritereRechercheAdherent;
import cm.cositi.api.adherent.dto.DecisionChangementAllocationDto;
import cm.cositi.api.adherent.dto.DemandeChangementAllocationDto;
import cm.cositi.api.adherent.dto.FinalisationAdherentDto;
import cm.cositi.api.adherent.dto.ModificationAdherentDto;
import cm.cositi.api.adherent.dto.PreinscriptionAdherentDto;
import cm.cositi.api.adherent.dto.PropositionChangementAllocationDto;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ServiceAdherent {

    AdherentDetailDto creer(CreationAdherentDto dto, Utilisateur auteur);

    /** Saisie préparatoire par l'Agent de terrain (§5) — jamais une création définitive. */
    AdherentDetailDto preinscrire(PreinscriptionAdherentDto dto, Utilisateur auteur);

    /** Complète un adhérent {@code PREINSCRIT} en dossier définitif — réservée à la Gestionnaire (§5). */
    AdherentDetailDto finaliser(UUID id, FinalisationAdherentDto dto, Utilisateur auteur);

    /** État des deux comptes métier (Sécurité Sociale/Épargne) d'un adhérent, sur un seul dossier (§7). */
    CompteAdherentDto comptes(UUID id, Utilisateur demandeur);

    AdherentDetailDto consulter(UUID id, Utilisateur demandeur);

    AdherentDetailDto modifier(UUID id, ModificationAdherentDto dto, Utilisateur auteur);

    ReponsePaginee<cm.cositi.api.adherent.dto.AdherentResumeDto> rechercher(
            CritereRechercheAdherent critere, Pageable pageable, Utilisateur demandeur);

    void archiver(UUID id, String motif, Utilisateur auteur);

    void changerStatut(UUID id, StatutAdherent nouveau, String motif, Utilisateur auteur);

    /**
     * Propose un changement de pack/allocation après création (RAPORT_V1.md §6.3/§7.2) — la Gestionnaire
     * ne l'applique jamais elle-même, le DAF décide ({@link #deciderChangementAllocation}).
     */
    DemandeChangementAllocationDto proposerChangementAllocation(UUID adherentId,
                                                                 PropositionChangementAllocationDto dto,
                                                                 Utilisateur auteur);

    /** Approuve (applique le pack/l'allocation) ou rejette une proposition — réservé au DAF. */
    DemandeChangementAllocationDto deciderChangementAllocation(UUID demandeId, DecisionChangementAllocationDto dto,
                                                                Utilisateur daf);

    List<DemandeChangementAllocationDto> historiqueChangementsAllocation(UUID adherentId, Utilisateur demandeur);
}
