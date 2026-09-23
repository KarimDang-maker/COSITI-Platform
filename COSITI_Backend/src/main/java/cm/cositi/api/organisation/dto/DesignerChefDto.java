package cm.cositi.api.organisation.dto;

import jakarta.validation.constraints.NotBlank;

public record DesignerChefDto(@NotBlank(message = "Le motif est obligatoire.") String motif) {
}
