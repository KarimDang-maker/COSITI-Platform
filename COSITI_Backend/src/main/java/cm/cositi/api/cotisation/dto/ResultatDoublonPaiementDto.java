package cm.cositi.api.cotisation.dto;

import java.util.List;

/**
 * Résultat du contrôle de doublon (#13).
 *
 * @param referenceDejaUtilisee {@code true} si la référence de transaction est déjà portée par un paiement actif
 *                              du même mode : l'enregistrement sera refusé ({@code PAIEMENT_REFERENCE_DEJA_UTILISEE}).
 *                              Calculé sur toute la base, sans révéler le paiement concerné s'il est hors périmètre.
 * @param doublonsPotentiels    paiements actifs du même adhérent, même date, même montant et même mode —
 *                              signalés, jamais bloquants. Limités au périmètre du demandeur.
 * @param doublonDetecte        synthèse : l'un ou l'autre des deux cas ci-dessus.
 */
public record ResultatDoublonPaiementDto(
        boolean referenceDejaUtilisee,
        List<PaiementDto> doublonsPotentiels,
        boolean doublonDetecte
) {
}
