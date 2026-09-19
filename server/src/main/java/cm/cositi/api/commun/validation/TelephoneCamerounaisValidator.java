package cm.cositi.api.commun.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class TelephoneCamerounaisValidator implements ConstraintValidator<TelephoneCamerounais, String> {

    // Format Camerounais standard : 9 chiffres débutant par 6 (65x, 67x, 68x, 69x, etc.)
    // ou avec indicatif international (+237 ou 237)
    private static final Pattern PATTERN_TEL = Pattern.compile("^(\\+?237)?[6][2-9][0-9]{7}$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.trim().isEmpty()) {
            return true; // Laisser @NotBlank gérer l'obligation si nécessaire
        }
        String nettoye = value.replaceAll("[\\s.-]", "");
        return PATTERN_TEL.matcher(nettoye).matches();
    }
}
