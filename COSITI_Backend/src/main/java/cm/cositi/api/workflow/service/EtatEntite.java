package cm.cositi.api.workflow.service;

import java.util.Map;

/**
 * État officiel d'une entité lu par un {@link AdaptateurWorkflow}.
 *
 * @param version               version JPA courante (verrouillage optimiste, §17)
 * @param valeurs               valeurs officielles des champs gérés par le workflow, en texte canonique
 * @param statutValidation      statut de validation (adhérent, agent) ou statut du paiement
 * @param modifiableDirectement {@code true} si les routes de modification directe restent autorisées
 */
public record EtatEntite(long version, Map<String, String> valeurs, String statutValidation,
                         boolean modifiableDirectement) {
}
