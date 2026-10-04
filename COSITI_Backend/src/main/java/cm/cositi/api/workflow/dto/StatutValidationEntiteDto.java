package cm.cositi.api.workflow.dto;

import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;

/**
 * État de validation d'une entité ({@code GET .../statut-validation}).
 *
 * @param statutValidation statut de validation du dossier/profil (adhérent, agent) ou statut du paiement
 * @param modifiableDirectement {@code true} si les routes de modification directe sont encore autorisées
 * @param demandeOuverte demande en cours sur l'entité, ou {@code null}
 * @param derniereDemande dernière demande clôturée, ou {@code null}
 */
public record StatutValidationEntiteDto(
        TypeEntiteWorkflow typeEntite,
        java.util.UUID entiteId,
        String statutValidation,
        Long version,
        boolean modifiableDirectement,
        DemandeValidationDto demandeOuverte,
        DemandeValidationDto derniereDemande
) {
}
