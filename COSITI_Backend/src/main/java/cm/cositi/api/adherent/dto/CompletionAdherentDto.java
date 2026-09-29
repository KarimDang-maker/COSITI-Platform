package cm.cositi.api.adherent.dto;

import java.util.List;
import java.util.UUID;

public record CompletionAdherentDto(
        UUID adherentId,
        int pourcentage,
        int champsRenseignes,
        int champsTotal,
        List<ChampManquantDto> champsManquants,
        List<String> avertissements
) {
}
