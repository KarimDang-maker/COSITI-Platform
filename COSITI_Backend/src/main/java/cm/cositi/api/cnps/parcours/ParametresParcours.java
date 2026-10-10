package cm.cositi.api.cnps.parcours;

import java.math.BigDecimal;

/** Valeurs lues dans la table {@code parametre} (modifiables par le DAF), jamais des constantes. */
public record ParametresParcours(BigDecimal quotaPreimmat, BigDecimal quotaImmat, int jourCoupure,
                                 int delaiDepotJours) {
}
