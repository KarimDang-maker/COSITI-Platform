package cm.cositi.api.adhesion.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Section « Frais d'adhésion » du dossier (§10) : montant requis fourni par le backend, et le frais enregistré
 * s'il existe ({@code null} sinon).
 */
public record FraisAdhesionAdherentDto(
        UUID adherentId,
        BigDecimal montantRequis,
        String devise,
        boolean enregistre,
        FraisAdhesionDto frais
) {
}
