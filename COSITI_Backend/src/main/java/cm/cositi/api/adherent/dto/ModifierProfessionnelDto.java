package cm.cositi.api.adherent.dto;

import java.util.UUID;

/** Entrée de {@code PUT /adherents/{id}/professionnel} (#30). Le pack se change via {@code POST /{id}/pack}. */
public record ModifierProfessionnelDto(
        UUID activiteId,
        String numeroCnps,
        UUID associationId
) {
}
