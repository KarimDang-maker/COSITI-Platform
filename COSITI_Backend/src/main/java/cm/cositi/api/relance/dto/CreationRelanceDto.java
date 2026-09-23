package cm.cositi.api.relance.dto;

import cm.cositi.api.relance.entite.CanalRelance;
import cm.cositi.api.relance.entite.ResultatRelance;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record CreationRelanceDto(
        @NotNull UUID adherentId,
        UUID campagneId,
        @NotNull CanalRelance canal,
        @NotNull ResultatRelance resultat,
        LocalDate prochaineActionLe,
        String commentaire
) {
}
