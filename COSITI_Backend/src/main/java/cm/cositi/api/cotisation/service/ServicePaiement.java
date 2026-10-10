package cm.cositi.api.cotisation.service;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.AnnulerPaiementDto;
import cm.cositi.api.cotisation.dto.CorrectionPaiementDto;
import cm.cositi.api.cotisation.dto.CritereJournalPaiement;
import cm.cositi.api.cotisation.dto.EnregistrementPaiementDto;
import cm.cositi.api.cotisation.dto.HistoriqueStatutPaiementDto;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.cotisation.dto.RecuDto;
import cm.cositi.api.cotisation.dto.ResultatDoublonPaiementDto;
import cm.cositi.api.cotisation.dto.StatistiquesQuotidiennesDto;
import cm.cositi.api.cotisation.dto.VerifierDoublonPaiementDto;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ServicePaiement {

    /**
     * 7 contrôles obligatoires (docs/02_CLASSES_ET_METHODES.md §4) : adhérent existant/non archivé/dans le
     * périmètre, montant strictement positif, référence obligatoire pour mobile money, date cohérente,
     * idempotence (clé déjà vue -> renvoie l'existant), numéro de reçu par séquence, statut initial
     * {@code A_CONTROLER} (jamais {@code VALIDE} directement).
     */
    ResultatEnregistrementPaiement enregistrer(EnregistrementPaiementDto dto, String cleIdempotence, Utilisateur auteur);

    /**
     * Variante avec saisie préparatoire (#14) : {@code brouillon = true} crée le paiement en {@code BROUILLON},
     * modifiable jusqu'à sa soumission ({@link #soumettre}). Mêmes contrôles que la saisie directe, plus le
     * refus d'une référence de transaction déjà utilisée (#13). Pas de méthode {@code default} déléguant à
     * l'autre surcharge : un appel interne contournerait le proxy, donc {@code @PreAuthorize} et la transaction.
     */
    ResultatEnregistrementPaiement enregistrer(EnregistrementPaiementDto dto, String cleIdempotence,
                                               Utilisateur auteur, boolean brouillon);

    /** #13 — contrôle de doublon sans rien créer. */
    ResultatDoublonPaiementDto verifierDoublon(VerifierDoublonPaiementDto dto, Utilisateur demandeur);

    /** #14 — {@code BROUILLON -> A_CONTROLER}. Réservé à l'auteur de la saisie ou à un utilisateur au périmètre global. */
    PaiementDto soumettre(UUID paiementId, Utilisateur auteur);

    /** Refuse si {@code validateur == créateur} (séparation saisie/validation, AGENTS.md règle absolue n°5). */
    PaiementDto valider(UUID paiementId, Utilisateur validateur);

    /** #17 — rejet définitif motivé. Mêmes garde-fous que {@link #valider} (permission, périmètre, auto-décision). */
    PaiementDto rejeter(UUID paiementId, String motif, Utilisateur validateur);

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

    RecuDto genererRecu(UUID paiementId, Utilisateur demandeur);

    PaiementDto consulter(UUID paiementId, Utilisateur demandeur);

    /** #18 — chronologie complète des statuts, reconstruite depuis le journal d'audit. */
    List<HistoriqueStatutPaiementDto> historiqueStatuts(UUID paiementId, Utilisateur demandeur);

    /** #27 — nombre et montants par statut et par mode pour une date, dans le périmètre du demandeur. */
    StatistiquesQuotidiennesDto statistiquesQuotidiennes(LocalDate date, Utilisateur demandeur);
}
