package cm.cositi.api.cotisation.service;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.AnnulerPaiementDto;
import cm.cositi.api.cotisation.dto.CorrectionPaiementDto;
import cm.cositi.api.cotisation.dto.CritereJournalPaiement;
import cm.cositi.api.cotisation.dto.EnregistrementPaiementDto;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.cotisation.dto.RecuDto;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ServicePaiement {

    /**
     * 7 contrôles obligatoires (docs/02_CLASSES_ET_METHODES.md §4) : adhérent existant/non archivé/dans le
     * périmètre, montant strictement positif, référence obligatoire pour mobile money, date cohérente,
     * idempotence (clé déjà vue -> renvoie l'existant), numéro de reçu par séquence, statut initial
     * {@code A_CONTROLER} (jamais {@code VALIDE} directement).
     */
    ResultatEnregistrementPaiement enregistrer(EnregistrementPaiementDto dto, String cleIdempotence, Utilisateur auteur);

    /** Refuse si {@code validateur == créateur} (séparation saisie/validation, AGENTS.md règle absolue n°5). */
    PaiementDto valider(UUID paiementId, Utilisateur validateur);

    PaiementDto corriger(UUID paiementId, CorrectionPaiementDto dto, Utilisateur auteur);

    void annuler(UUID paiementId, AnnulerPaiementDto dto, Utilisateur auteur);

    /**
     * Confirmation hiérarchique du Chef des agents de terrain (UC-CHEF-10, jalon J5). Réservée à un utilisateur
     * portant {@code CHEF_AGENT_TERRAIN}, dans le périmètre de l'agent encaisseur du paiement. Ne change pas
     * le statut du paiement — seul {@code confirme_par_chef_id}/{@code confirme_le} sont renseignés.
     */
    PaiementDto confirmerParChef(UUID paiementId, String motif, Utilisateur chefUtilisateur);

    /**
     * Signalement d'une incohérence par le DAF (jalon J5). Motif obligatoire, transition vers {@code INCOHERENCE},
     * bloque toute validation ultérieure tant que l'incohérence n'est pas résolue par {@link #corriger}.
     */
    PaiementDto signalerIncoherence(UUID paiementId, String motif, Utilisateur dafUtilisateur);

    ReponsePaginee<PaiementDto> journal(CritereJournalPaiement critere, Pageable pageable, Utilisateur demandeur);

    RecuDto genererRecu(UUID paiementId);

    PaiementDto consulter(UUID paiementId, Utilisateur demandeur);
}
