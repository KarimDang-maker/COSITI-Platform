package cm.cositi.api.workflow.service;

import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.workflow.entite.TypeDonneeChamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.UUID;

/**
 * Représentation texte canonique des valeurs d'une demande : la valeur officielle et la valeur proposée sont
 * comparées sous cette forme, et c'est elle qui est stockée dans {@code demande_validation_element}.
 */
public final class ValeursWorkflow {

    private ValeursWorkflow() {
    }

    /** Valeur Java -> texte canonique ({@code null} reste {@code null}). */
    public static String texte(Object valeur) {
        if (valeur == null) {
            return null;
        }
        if (valeur instanceof BigDecimal d) {
            return d.signum() == 0 ? "0" : d.stripTrailingZeros().toPlainString();
        }
        if (valeur instanceof Enum<?> e) {
            return e.name();
        }
        String brut = valeur.toString().trim();
        return brut.isEmpty() ? null : brut;
    }

    /** Texte saisi -> texte canonique selon le type ; 400 si la valeur ne respecte pas le type. */
    public static String normaliser(String champ, TypeDonneeChamp type, String brut) {
        if (brut == null || brut.isBlank()) {
            return null;
        }
        String valeur = brut.trim();
        try {
            return switch (type) {
                case TEXTE -> valeur;
                case DATE -> LocalDate.parse(valeur).toString();
                case DECIMAL -> texte(new BigDecimal(valeur));
                case UUID -> UUID.fromString(valeur).toString();
                case BOOLEEN -> {
                    if (!valeur.equalsIgnoreCase("true") && !valeur.equalsIgnoreCase("false")) {
                        throw new IllegalArgumentException(valeur);
                    }
                    yield valeur.toLowerCase(Locale.ROOT);
                }
                case ENUM -> valeur.toUpperCase(Locale.ROOT);
            };
        } catch (DateTimeParseException | IllegalArgumentException e) {
            throw new ExceptionValidation("DEMANDE_VALEUR_INVALIDE",
                    "Valeur invalide pour le champ « " + champ + " » (type attendu : " + type + ").", champ);
        }
    }

    public static BigDecimal enDecimal(String valeur) {
        return valeur == null ? null : new BigDecimal(valeur);
    }

    public static LocalDate enDate(String valeur) {
        return valeur == null ? null : LocalDate.parse(valeur);
    }

    public static UUID enUuid(String valeur) {
        return valeur == null ? null : UUID.fromString(valeur);
    }

    public static Boolean enBooleen(String valeur) {
        return valeur == null ? null : Boolean.valueOf(valeur);
    }
}
