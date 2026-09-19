package cm.cositi.api.reporting.dto;

import java.math.BigDecimal;

public record TableauBordDirectionDto(
    long totalAdherents,
    long adherentsActifs,
    long adherentsJamaisCotise,
    long adherentsEnRetard,
    double tauxActivationPourcentage,
    BigDecimal collecteMoisEnCours,
    BigDecimal cumulCollecteAnnee
) {}
