package cm.cositi.api.workflow.dto;

import cm.cositi.api.workflow.entite.DemandeValidation;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Réponse (§15 {@code ValidationRequestResponse}). {@code avertissements} : informations produites par la dernière
 * opération (recontrôle de complétude, bilan de caisse désynchronisé…), jamais persistées ici — elles le sont
 * dans le journal d'audit.
 */
public record DemandeValidationDto(
        UUID id,
        String reference,
        TypeEntiteWorkflow typeEntite,
        UUID entiteId,
        TypeOperationWorkflow typeOperation,
        StatutDemandeValidation statut,
        UUID demandePar,
        String demandeParIdentifiant,
        Instant demandeLe,
        Instant soumiseLe,
        UUID examineePar,
        Instant examineeLe,
        Instant appliqueeLe,
        String motif,
        String commentaireValidateur,
        long versionBase,
        Long version,
        List<ElementDemandeValidationDto> elements,
        List<DocumentDemandeValidationDto> documents,
        List<String> avertissements
) {
    public static DemandeValidationDto depuis(DemandeValidation d, List<ElementDemandeValidationDto> elements,
                                              List<DocumentDemandeValidationDto> documents, List<String> avertissements) {
        return new DemandeValidationDto(d.getId(), d.getReference(), d.getTypeEntite(), d.getEntiteId(),
                d.getTypeOperation(), d.getStatut(), d.getDemandePar(), d.getDemandeParIdentifiant(), d.getDemandeLe(),
                d.getSoumiseLe(), d.getExamineePar(), d.getExamineeLe(), d.getAppliqueeLe(), d.getMotif(),
                d.getCommentaireValidateur(), d.getVersionBase(), d.getVersion(), elements, documents,
                avertissements == null ? List.of() : avertissements);
    }
}
