package cm.cositi.api.cotisation.dto;

import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.workflow.entite.StatutValidationEntite;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Ce qu'il faut pour enregistrer une cotisation à partir d'un matricule COSITI (règles module 2 §1, prompt §7.1) :
 * de quoi confirmer qu'il s'agit du bon adhérent, s'il peut cotiser, et les règles de répartition en vigueur — le
 * formulaire n'a ainsi aucun seuil codé en dur.
 *
 * @param packRequis      première cotisation : un pack doit être choisi ({@code EnregistrementPaiementDto.packId})
 * @param cotisable       {@code false} si une règle serveur refuserait la cotisation ({@code motifsBlocage})
 */
public record ContexteCotisationDto(
        UUID adherentId,
        String matricule,
        String nom,
        String prenoms,
        String telephonePrincipal,
        String zoneLibelle,
        StatutAdherent statut,
        StatutValidationEntite statutValidation,
        UUID packId,
        String packCode,
        String packLibelle,
        boolean packRequis,
        BigDecimal minimumSecuriteSociale,
        BigDecimal minimumEpargne,
        boolean epargneFacultative,
        boolean cotisable,
        List<String> motifsBlocage,
        List<String> avertissements
) {
}
