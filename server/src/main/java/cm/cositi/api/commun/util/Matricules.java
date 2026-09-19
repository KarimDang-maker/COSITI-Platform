package cm.cositi.api.commun.util;

import java.util.regex.Pattern;

public final class Matricules {

    private static final Pattern PATTERN_MATRICULE = Pattern.compile("^COSITI-\\d{5,}$");

    private Matricules() {}

    public static String formater(long sequence) {
        return String.format("COSITI-%05d", sequence);
    }

    public static boolean estValide(String matricule) {
        return matricule != null && PATTERN_MATRICULE.matcher(matricule).matches();
    }
}
