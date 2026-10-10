package cm.cositi.api.document.dto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Options d'un téléversement (document des règles v2.0, §21-22) : période de validité quand elle s'applique au type de
 * pièce, et remplacement versionné d'une pièce existante (motif obligatoire, l'ancienne version est conservée).
 */
public record OptionsTeleversementDto(
        LocalDate valideDu,
        LocalDate valideJusquau,
        UUID remplaceDocumentId,
        String motifRemplacement
) {
    public static OptionsTeleversementDto aucune() {
        return new OptionsTeleversementDto(null, null, null, null);
    }
}
