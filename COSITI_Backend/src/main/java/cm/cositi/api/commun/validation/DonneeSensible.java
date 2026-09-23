package cm.cositi.api.commun.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marque un champ comme sensible (CNI, téléphone, secrets…) : masqué par le sérialiseur d'audit
 * ({@code cm.cositi.api.audit.service.MasqueurDonnees}) et jamais journalisé en clair dans les logs applicatifs.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface DonneeSensible {
}
