package cm.cositi.api.adherent.dto;

import java.util.UUID;

/** Sous-ensemble « informations professionnelles » de la fiche adhérent (#29). */
public record ProfilProfessionnelDto(
        UUID adherentId,
        UUID activiteId,
        String numeroCnps,
        UUID associationId,
        UUID packIdCourant
) {
}
