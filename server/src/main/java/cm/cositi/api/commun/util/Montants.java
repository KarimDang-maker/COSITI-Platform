package cm.cositi.api.commun.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class Montants {

    public static final int ECHELLE_DEVISE = 2;
    public static final RoundingMode ARRONDI_PAR_DEFAUT = RoundingMode.HALF_UP;

    private Montants() {}

    public static BigDecimal normaliser(BigDecimal montant) {
        if (montant == null) return BigDecimal.ZERO.setScale(ECHELLE_DEVISE, ARRONDI_PAR_DEFAUT);
        return montant.setScale(ECHELLE_DEVISE, ARRONDI_PAR_DEFAUT);
    }

    public static boolean estPositif(BigDecimal montant) {
        return montant != null && montant.compareTo(BigDecimal.ZERO) > 0;
    }

    public static boolean estEgal(BigDecimal m1, BigDecimal m2) {
        if (m1 == null && m2 == null) return true;
        if (m1 == null || m2 == null) return false;
        return m1.compareTo(m2) == 0;
    }
}
