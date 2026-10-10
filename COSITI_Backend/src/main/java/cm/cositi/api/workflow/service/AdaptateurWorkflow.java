package cm.cositi.api.workflow.service;

import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.workflow.dto.DecisionDemandeDto;
import cm.cositi.api.workflow.entite.DemandeValidation;
import cm.cositi.api.workflow.entite.ElementDemandeValidation;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.TypeDonneeChamp;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Point d'intégration d'un module dans le socle de workflow (§3). Le socle porte le cycle, l'autorité, la
 * concurrence, l'idempotence, l'audit et les notifications ; chaque module ne fournit que ce qui lui est propre :
 * ses champs, son périmètre, ses règles métier et l'application atomique d'une demande approuvée. Toutes les
 * méthodes sont appelées dans la transaction du service de workflow.
 */
public interface AdaptateurWorkflow {

    TypeEntiteWorkflow typeEntite();

    /** Champs proposables pour l'opération, dans l'ordre d'affichage, avec leur type. */
    Map<String, TypeDonneeChamp> champs(TypeOperationWorkflow operation);

    /**
     * État officiel de l'entité. {@code verrouiller = true} pose un verrou {@code SELECT … FOR UPDATE} jusqu'à la fin
     * de la transaction (§12 étape 1). Lève une {@code ExceptionRessourceIntrouvable} si l'entité n'existe pas.
     */
    EtatEntite etat(UUID entiteId, boolean verrouiller);

    /** Contrôle du périmètre de données de l'utilisateur sur l'entité (AGENTS.md règle absolue n°4). */
    boolean peutAcceder(UUID entiteId, Utilisateur utilisateur);

    /** Refuse (409) l'ouverture d'une demande si l'état de l'entité ne s'y prête pas. */
    void controlerOuverture(UUID entiteId, TypeOperationWorkflow operation);

    /**
     * Règles métier sur les valeurs résultantes (officielles + propositions) — 400 en cas de violation.
     *
     * @param propositions seulement les champs effectivement modifiés
     */
    void controlerPropositions(UUID entiteId, TypeOperationWorkflow operation, Map<String, String> valeursResultantes,
                               Map<String, String> propositions);

    /** Recontrôles avant approbation (doublons, complétude…). Renvoie des avertissements non bloquants. */
    List<String> controlerAvantApprobation(DemandeValidation demande, DecisionDemandeDto decision,
                                           Utilisateur validateur);

    /**
     * Application atomique d'une demande approuvée (§12) : invariants revalidés, valeurs appliquées, recalculs,
     * audit métier, événement de domaine. Renvoie des avertissements non bloquants.
     */
    List<String> appliquer(DemandeValidation demande, List<ElementDemandeValidation> elements, Utilisateur validateur);

    /** Répercute le statut d'une demande de validation initiale sur le statut de validation de l'entité. */
    void synchroniserStatut(UUID entiteId, TypeOperationWorkflow operation, StatutDemandeValidation statutDemande);

    /** Adhérent auquel l'entité se rattache (pour contrôler l'origine d'un justificatif), ou {@code null}. */
    UUID adherentConcerne(UUID entiteId);
}
