package cm.cositi.api.regle.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Règle encore provisoire : paramètre {@code V}/{@code A} ou exigence documentaire non confirmée.
 *
 * @param source {@code PARAMETRE} ou {@code EXIGENCE_DOCUMENTAIRE}
 * @param cle    clé du paramètre ou code de l'exigence
 * @param valeur valeur appliquée en attendant la décision (niveau pour une exigence)
 */
public record RegleEnAttenteDto(
        String source,
        UUID id,
        String cle,
        String libelle,
        String valeur,
        String statutValidation,
        Instant modifieLe,
        String modifiePar
) {
}
