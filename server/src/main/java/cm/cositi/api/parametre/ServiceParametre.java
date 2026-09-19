package cm.cositi.api.parametre;

import java.math.BigDecimal;
import java.util.List;

public interface ServiceParametre {
    String texte(String cle);
    BigDecimal decimal(String cle);
    int entier(String cle);
    boolean booleen(String cle);
    boolean estValide(String cle);
    void modifier(String cle, String valeur, String motif, String auteur);
    List<Parametre> listerTous();
}
