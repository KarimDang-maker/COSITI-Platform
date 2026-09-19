package cm.cositi.api.cotisation.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record AffectationDto(
    UUID id,
    String composanteCode,
    String composanteLibelle,
    BigDecimal montant,
    String regleAppliquee
) {}
