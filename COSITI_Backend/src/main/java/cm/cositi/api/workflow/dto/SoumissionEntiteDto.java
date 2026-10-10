package cm.cositi.api.workflow.dto;

import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Soumission d'un dossier adhérent ou d'un profil d'agent (création contrôlée). Corps facultatif : sans motif, un
 * motif par défaut est enregistré.
 */
public record SoumissionEntiteDto(
        @Size(max = 1000, message = "Le motif ne peut pas dépasser 1000 caractères.") String motif,
        List<UUID> documentIds,
        Long versionBase,
        @Size(max = 80, message = "La clé d'idempotence ne peut pas dépasser 80 caractères.") String cleIdempotence
) {
}
