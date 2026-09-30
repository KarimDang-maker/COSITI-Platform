package cm.cositi.api.reporting.dto;

import java.math.BigDecimal;

/**
 * Une valeur mise en avant d'un tableau de bord (« 172 adhérents », « 33,1 % d'activation »).
 *
 * <p>{@code unite} indique au client comment la mettre en forme sans qu'il ait à deviner :
 * {@code NOMBRE}, {@code MONTANT}, {@code POURCENTAGE}, {@code JOURS}. Le formatage lui-même reste côté
 * client (`src/lib/format.ts`), le serveur ne renvoie jamais une chaîne déjà formatée — sans quoi la même
 * donnée s'afficherait différemment selon l'endpoint qui l'a produite.</p>
 */
public record IndicateurCle(String cle, String libelle, BigDecimal valeur, String unite) {

    public static IndicateurCle nombre(String cle, String libelle, long valeur) {
        return new IndicateurCle(cle, libelle, BigDecimal.valueOf(valeur), "NOMBRE");
    }

    public static IndicateurCle montant(String cle, String libelle, BigDecimal valeur) {
        return new IndicateurCle(cle, libelle, valeur == null ? BigDecimal.ZERO : valeur, "MONTANT");
    }

    public static IndicateurCle pourcentage(String cle, String libelle, BigDecimal ratio) {
        return new IndicateurCle(cle, libelle, ratio == null ? BigDecimal.ZERO : ratio, "POURCENTAGE");
    }
}
