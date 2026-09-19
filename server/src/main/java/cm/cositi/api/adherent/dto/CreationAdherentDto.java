package cm.cositi.api.adherent.dto;

import cm.cositi.api.commun.validation.TelephoneCamerounais;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreationAdherentDto(
    @NotBlank(message = "Le nom est obligatoire.")
    String nom,

    String prenoms,

    @Past(message = "La date de naissance doit être dans le passé.")
    LocalDate dateNaissance,

    String sexe,

    @NotBlank(message = "Le téléphone principal est obligatoire.")
    @TelephoneCamerounais
    String telephonePrincipal,

    @TelephoneCamerounais
    String telephoneSecondaire,

    String numeroCni,

    String numeroCnps,

    @NotNull(message = "L'activité est obligatoire.")
    UUID activiteId,

    @NotNull(message = "La zone est obligatoire.")
    UUID zoneId,

    UUID associationId,

    @NotBlank(message = "La localisation est obligatoire.")
    String localisation,

    String quartier,
    String ville,
    BigDecimal latitude,
    BigDecimal longitude,

    @NotNull(message = "La date d'adhésion est obligatoire.")
    LocalDate dateAdhesion,

    @NotNull(message = "Le pack de cotisation est obligatoire.")
    UUID packId,

    UUID agentReferentId,

    boolean inscriptionPayee,

    boolean consentementDonnees,

    boolean confirmationDoublonIgnore
) {}
