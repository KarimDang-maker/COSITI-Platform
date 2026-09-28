package cm.cositi.api.parametre;

import java.math.BigDecimal;

/**
 * Aucune règle {@code [V]} ne vit dans le code. Toute lecture d'une règle métier paramétrable passe par ce service.
 */
public interface ServiceParametre {

    String texte(String cle);

    BigDecimal decimal(String cle);

    int entier(String cle);

    boolean booleen(String cle);

    <T> T json(String cle, Class<T> type);

    /** {@code false} si {@code statut_validation = 'V'} — l'appelant doit alors journaliser un avertissement. */
    boolean estValide(String cle);

    void modifier(String cle, String valeur, String motif, String auteur);
}
