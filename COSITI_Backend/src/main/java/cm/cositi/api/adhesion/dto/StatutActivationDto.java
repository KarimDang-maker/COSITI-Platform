package cm.cositi.api.adhesion.dto;

import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.entite.StatutControleDga;
import cm.cositi.api.workflow.entite.StatutValidationEntite;

import java.time.Instant;
import java.util.UUID;

/**
 * État d'activation et de contrôle DGA (§2) : {@code statut} (compte, ex. ACTIF) et {@code statutControleDga}
 * (ex. EN_ATTENTE_DGA) sont deux états distincts.
 *
 * @param dejaActive {@code true} quand l'appel d'activation n'a rien changé (idempotence)
 */
public record StatutActivationDto(
        UUID adherentId,
        String matricule,
        StatutAdherent statut,
        StatutValidationEntite statutValidation,
        StatutControleDga statutControleDga,
        Instant activeLe,
        UUID activePar,
        Instant premiereSoumissionDgaLe,
        Instant derniereSoumissionDgaLe,
        UUID controleCourantId,
        String controleCourantReference,
        boolean dejaActive,
        Long version
) {
}
