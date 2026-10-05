package cm.cositi.api.adherent.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Sous-ensemble « coordonnées » de la fiche adhérent (#31). */
public record CoordonneesAdherentDto(
        UUID adherentId,
        String telephonePrincipal,
        String telephoneSecondaire,
        String whatsapp,
        String email,
        String numeroCni,
        String localisation,
        String quartier,
        String ville,
        BigDecimal latitude,
        BigDecimal longitude
) {
}
