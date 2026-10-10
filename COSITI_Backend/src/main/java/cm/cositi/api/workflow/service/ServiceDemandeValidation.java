package cm.cositi.api.workflow.service;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.workflow.dto.CreationDemandeValidationDto;
import cm.cositi.api.workflow.dto.DecisionDemandeDto;
import cm.cositi.api.workflow.dto.DecisionDemandeValidationDto;
import cm.cositi.api.workflow.dto.DemandeModificationDto;
import cm.cositi.api.workflow.dto.SoumissionEntiteDto;
import cm.cositi.api.workflow.dto.DemandeValidationDto;
import cm.cositi.api.workflow.dto.DocumentDemandeValidationDto;
import cm.cositi.api.workflow.dto.ElementDemandeValidationDto;
import cm.cositi.api.workflow.dto.ResoumissionDemandeDto;
import cm.cositi.api.workflow.dto.StatutValidationEntiteDto;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Cycle de validation (§7 {@code ValidationRequestService}) : création, soumission, approbation, rejet, demande de
 * correction, resoumission, annulation. Chaque mutation est transactionnelle, verrouillée, idempotente, auditée et
 * publiée après commit.
 */
public interface ServiceDemandeValidation {

    DemandeValidationDto creer(CreationDemandeValidationDto dto, Utilisateur demandeur);

    DemandeValidationDto consulter(UUID demandeId, Utilisateur demandeur);

    ReponsePaginee<DemandeValidationDto> lister(StatutDemandeValidation statut, TypeEntiteWorkflow typeEntite,
                                                TypeOperationWorkflow typeOperation, UUID entiteId,
                                                boolean seulementMesDemandes, Pageable pageable, Utilisateur demandeur);

    /** File de validation : demandes soumises que l'utilisateur est habilité à décider (jamais les siennes). */
    ReponsePaginee<DemandeValidationDto> listerEnAttente(TypeEntiteWorkflow typeEntite, Pageable pageable,
                                                         Utilisateur validateur);

    DemandeValidationDto soumettre(UUID demandeId, DecisionDemandeDto commande, Utilisateur demandeur);

    DemandeValidationDto approuver(UUID demandeId, DecisionDemandeDto commande, Utilisateur validateur);

    DemandeValidationDto rejeter(UUID demandeId, DecisionDemandeDto commande, Utilisateur validateur);

    DemandeValidationDto demanderCorrection(UUID demandeId, DecisionDemandeDto commande, Utilisateur validateur);

    DemandeValidationDto resoumettre(UUID demandeId, ResoumissionDemandeDto commande, Utilisateur demandeur);

    DemandeValidationDto annuler(UUID demandeId, DecisionDemandeDto commande, Utilisateur demandeur);

    List<ElementDemandeValidationDto> elements(UUID demandeId, Utilisateur demandeur);

    List<DecisionDemandeValidationDto> decisions(UUID demandeId, Utilisateur demandeur);

    List<DocumentDemandeValidationDto> documents(UUID demandeId, Utilisateur demandeur);

    DocumentDemandeValidationDto joindreJustificatif(UUID demandeId, UUID documentId, Utilisateur demandeur);

    /**
     * Soumission d'un dossier/profil depuis la route du module ({@code POST /adherents/{id}/soumettre},
     * {@code POST /agents/{id}/soumettre}) : crée et soumet la demande de validation initiale, ou resoumet celle
     * que le validateur a renvoyée en correction.
     */
    DemandeValidationDto soumettreEntite(TypeOperationWorkflow operation, UUID entiteId, SoumissionEntiteDto dto,
                                         Utilisateur demandeur);

    /** Demande de modification depuis la route du module (entité et opération tirées de l'URL). */
    DemandeValidationDto creerPourEntite(TypeOperationWorkflow operation, UUID entiteId, DemandeModificationDto dto,
                                         Utilisateur demandeur);

    /** Détail d'une demande en vérifiant qu'elle concerne bien l'entité de l'URL (404 sinon). */
    DemandeValidationDto consulterPourEntite(TypeEntiteWorkflow typeEntite, UUID entiteId, UUID demandeId,
                                             Utilisateur demandeur);

    /** État de validation d'une entité ({@code GET /{module}/{id}/statut-validation}). */
    StatutValidationEntiteDto statutEntite(TypeEntiteWorkflow typeEntite, UUID entiteId, Utilisateur demandeur);

    /** Historique des demandes d'une entité, éventuellement restreint à certaines opérations. */
    List<DemandeValidationDto> historiqueEntite(TypeEntiteWorkflow typeEntite, UUID entiteId,
                                                Collection<TypeOperationWorkflow> operations, Utilisateur demandeur);
}
