package cm.cositi.api.reporting.dto;

import java.math.BigDecimal;

public record TableauBordDafDto(
    BigDecimal especesEnAttenteRemise,
    long remisesEnEcart,
    long paiementsAControler,
    long paiementsSansReference,
    long paiementsConfirmesChefEnAttenteDaf,
    BigDecimal collecteTotaleMois
) {}
