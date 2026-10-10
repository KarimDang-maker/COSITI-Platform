package cm.cositi.api.adhesion.dto;

import cm.cositi.api.adhesion.entite.StatutCorrespondance;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Décision de la DGA sur une information (§13, §14). Le commentaire est obligatoire pour toute réponse autre que
 * {@code CORRESPOND} ; la valeur lue sur le document est obligatoire pour {@code NON_CORRESPOND}.
 *
 * @param version version du champ lue par la DGA (facultative) : 409 si un autre contrôleur l'a modifié
 */
public record VerifierChampDto(
        @NotNull(message = "Le résultat de la comparaison est obligatoire.") StatutCorrespondance statutCorrespondance,
        @Size(max = 500, message = "La valeur lue ne peut pas dépasser 500 caractères.") String valeurPhysique,
        @Size(max = 1000, message = "Le commentaire ne peut pas dépasser 1000 caractères.") String commentaire,
        Long version
) {
}
