package cm.cositi.api.reporting.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Ligne de la vue matérialisée {@code vue_synthese_zone} (V11). */
public record LigneZone(
        UUID zoneId,
        String code,
        String libelle,
        long nbAdherents,
        long nbActifs,
        long nbEnRetard,
        BigDecimal cumulCollecte,
        long nbAgents
) {
}
