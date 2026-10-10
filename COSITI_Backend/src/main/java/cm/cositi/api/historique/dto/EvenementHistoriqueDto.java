package cm.cositi.api.historique.dto;

import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.historique.CategorieHistorique;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Événement de l'historique d'un adhérent (prompt §16). Lecture seule : l'historique est une trace de référence,
 * jamais modifiable par les utilisateurs (règles module 3 §6).
 *
 * @param acteurRoles      rôles ACTUELS du compte auteur (le journal n'enregistre pas le rôle tenu au moment de
 *                         l'action) ; vide pour une opération du système
 * @param referenceMetier  numéro de reçu, référence de frais / de demande / de contrôle, matricule… selon l'objet
 * @param details          contexte utile (montants, répartition, statut, type de pièce…), choisi sur liste blanche
 * @param modifications    champs modifiés, avant / après ; les données personnelles sensibles sont masquées
 */
public record EvenementHistoriqueDto(
        UUID id,
        UUID adherentId,
        Instant horodatage,
        String acteur,
        List<String> acteurRoles,
        TypeOperation typeEvenement,
        CategorieHistorique categorie,
        String module,
        String action,
        String resultat,
        String referenceMetier,
        String objet,
        UUID objetId,
        String motif,
        Map<String, Object> details,
        List<ModificationChampDto> modifications,
        String correlationId
) {
}
