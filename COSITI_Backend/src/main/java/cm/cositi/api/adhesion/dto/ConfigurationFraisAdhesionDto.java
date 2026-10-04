package cm.cositi.api.adhesion.dto;

import java.math.BigDecimal;

/** Configuration courante du frais d'adhésion (§5 {@code getCurrentAdhesionFee}) — le frontend ne la duplique jamais. */
public record ConfigurationFraisAdhesionDto(
        String typeFrais,
        BigDecimal montantUnitaire,
        String devise,
        String parametre,
        boolean regleValidee
) {
}
