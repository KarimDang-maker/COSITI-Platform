package cm.cositi.api.document.dto;

import java.util.UUID;

/**
 * Objet auquel un document est rattaché. Exactement l'un des deux est attendu : un document flottant, sans
 * adhérent ni paiement, n'aurait pas de périmètre de données et donc pas de contrôle d'accès possible.
 */
public record RattachementDto(UUID adherentId, UUID paiementId) {

    public boolean estValide() {
        return (adherentId != null) ^ (paiementId != null);
    }
}
