package cm.cositi.api.adherent.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record AdherentDetailDto(
    UUID id,
    String matricule,
    String nom,
    String prenoms,
    LocalDate dateNaissance,
    String sexe,
    String telephonePrincipal,
    String telephoneSecondaire,
    String numeroCni,
    String numeroCnps,
    UUID activiteId,
    String activiteLibelle,
    UUID zoneId,
    String zoneLibelle,
    UUID associationId,
    String associationNom,
    String localisation,
    String quartier,
    String ville,
    LocalDate dateAdhesion,
    String statut,
    boolean inscriptionPayee,
    UUID packActuelId,
    String packActuelLibelle,
    UUID agentReferentId,
    String agentReferentNom
) {}
