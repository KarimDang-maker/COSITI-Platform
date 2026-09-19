package cm.cositi.api.commun.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = TelephoneCamerounaisValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface TelephoneCamerounais {
    String message() default "Le numéro de téléphone doit être un numéro camerounais valide (ex. 6XXXXXXXX).";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
