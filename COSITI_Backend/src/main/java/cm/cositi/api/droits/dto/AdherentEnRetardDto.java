package cm.cositi.api.droits.dto;

import java.time.LocalDate;
import java.util.UUID;

public record AdherentEnRetardDto(
        UUID adherentId,
        String matricule,
        String nomComplet,
        LocalDate couvertJusquAu,
        int joursRetard
) {
}
