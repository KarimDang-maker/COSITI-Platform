package cm.cositi.api.organisation.dto;

/**
 * #8, #10, #11 — résumé chiffré du portefeuille d'un agent. La complétion est calculée par
 * {@code EvaluationCompletionAdherent}, la même formule que {@code GET /adherents/{id}/completion} —
 * jamais une seconde règle inventée pour le même concept.
 */
public record ResumePortefeuilleDto(
        int totalAdherents,
        int dossiersComplets,
        int dossiersIncomplets
) {
}
