package cm.cositi.api.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/** Demande d'activation ou de désactivation d'un agent validé (§10) — désactivation logique, motivée, validée. */
public record DemandeChangementStatutAgentDto(
        @NotNull(message = "Le statut demandé est obligatoire.") Boolean actif,
        @NotBlank(message = "Le motif est obligatoire.")
        @Size(max = 1000, message = "Le motif ne peut pas dépasser 1000 caractères.") String motif,
        List<UUID> documentIds,
        Long versionBase,
        @Size(max = 80, message = "La clé d'idempotence ne peut pas dépasser 80 caractères.") String cleIdempotence
) {
}
