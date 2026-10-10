package cm.cositi.api.workflow.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Rattache un document déjà téléversé ({@code POST /documents}) à une demande (§8). */
public record JoindreJustificatifDto(@NotNull(message = "Le document est obligatoire.") UUID documentId) {
}
