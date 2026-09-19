package cm.cositi.api.adherent.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record AdherentResumeDto(
    UUID id,
    String matricule,
    String nomComplet,
    String telephone,
    String activiteLibelle,
    String zoneLibelle,
    String agentReferentNom,
    String packLibelle,
    String statut,
    BigDecimal cumulCotise,
    LocalDate derniereCotisation
) {}
