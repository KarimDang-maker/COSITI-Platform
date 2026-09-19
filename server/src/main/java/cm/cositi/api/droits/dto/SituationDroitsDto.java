package cm.cositi.api.droits.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SituationDroitsDto(
    UUID adherentId,
    String matricule,
    LocalDate couvertJusquAu,
    int joursCouvertsTotal,
    int joursRetard,
    BigDecimal cumulCotise,
    BigDecimal soldeAvantSeuil,
    String statutRegularite,
    boolean eligibleCnps,
    List<String> avertissements
) {}
