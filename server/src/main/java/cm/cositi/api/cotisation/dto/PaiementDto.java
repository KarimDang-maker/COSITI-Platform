package cm.cositi.api.cotisation.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PaiementDto(
    UUID id,
    UUID adherentId,
    String adherentMatricule,
    String adherentNomComplet,
    String numeroRecu,
    LocalDate datePaiement,
    BigDecimal montant,
    String modePaiement,
    String referenceTransaction,
    String typePaiement,
    String statut,
    UUID agentEncaisseurId,
    String agentEncaisseurNom,
    String creePar,
    Instant creeLe,
    String validePar,
    Instant valideLe,
    List<AffectationDto> affectations
) {}
