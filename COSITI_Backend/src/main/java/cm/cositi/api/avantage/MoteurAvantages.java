package cm.cositi.api.avantage;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Évaluation des critères d'un avantage pour un adhérent, sans accès base : testable avec n'importe quelle date. */
public final class MoteurAvantages {

    private MoteurAvantages() {
    }

    public record AyantDroit(String typeLien, LocalDate dateNaissance) {
    }

    public record Contexte(UUID adherentId, String statut, LocalDate dateAdhesion, LocalDate dateNaissance,
                           String packCode, BigDecimal cumul, boolean immatricule, boolean preimmatricule,
                           boolean droitsCouverts, boolean archivageComplet, List<AyantDroit> ayantsDroit) {
    }

    public record Critere(TypeCritere type, String valeur) {
    }

    public record ResultatCritere(Critere critere, boolean satisfait, String libelle) {
    }

    public static ResultatCritere evaluer(Critere c, Contexte ctx, LocalDate aujourdhui) {
        boolean ok = switch (c.type()) {
            case IMMATRICULE -> ctx.immatricule();
            case PREIMMATRICULE -> ctx.preimmatricule() || ctx.immatricule();
            case COTISATION_MINIMUM -> {
                BigDecimal minimum = decimal(c.valeur());
                yield minimum != null && ctx.cumul() != null && ctx.cumul().compareTo(minimum) >= 0;
            }
            case STATUT_ADHERENT -> liste(c.valeur()).contains(ctx.statut());
            case ANCIENNETE_MOIS_MIN -> {
                Integer mois = entier(c.valeur());
                yield mois != null && ctx.dateAdhesion() != null
                        && Period.between(ctx.dateAdhesion(), aujourdhui).toTotalMonths() >= mois;
            }
            case AGE_MIN -> {
                Integer age = entier(c.valeur());
                yield age != null && ctx.dateNaissance() != null
                        && Period.between(ctx.dateNaissance(), aujourdhui).getYears() >= age;
            }
            case PACK -> ctx.packCode() != null && liste(c.valeur()).contains(ctx.packCode());
            case DROITS_COUVERTS -> ctx.droitsCouverts();
            case AYANT_DROIT -> c.valeur() != null && ctx.ayantsDroit().stream()
                    .anyMatch(a -> a.typeLien().equalsIgnoreCase(c.valeur().trim()));
            case ENFANT_AGE_MAX -> {
                Integer max = entier(c.valeur());
                yield max != null && ctx.ayantsDroit().stream()
                        .filter(a -> "ENFANT".equals(a.typeLien()) && a.dateNaissance() != null)
                        .anyMatch(a -> Period.between(a.dateNaissance(), aujourdhui).getYears() <= max);
            }
            case ARCHIVAGE_COMPLET -> ctx.archivageComplet();
        };
        return new ResultatCritere(c, ok, libelle(c));
    }

    /**
     * ACQUIS si tout est rempli ; sinon SUSPENDU pour qui avait déjà l'avantage (ou l'avait perdu), EN_COURS si une
     * partie des critères est remplie, NON_ELIGIBLE sinon. Un avantage sans critère n'est jamais acquis : un
     * catalogue incomplet ne doit pas ouvrir de droits.
     */
    public static StatutAvantage statut(StatutAvantage precedent, long satisfaits, long total) {
        if (total == 0) {
            return StatutAvantage.NON_ELIGIBLE;
        }
        if (satisfaits == total) {
            return StatutAvantage.ACQUIS;
        }
        if (precedent == StatutAvantage.ACQUIS || precedent == StatutAvantage.SUSPENDU) {
            return StatutAvantage.SUSPENDU;
        }
        return satisfaits > 0 ? StatutAvantage.EN_COURS : StatutAvantage.NON_ELIGIBLE;
    }

    public static String libelle(Critere c) {
        String v = c.valeur() == null ? "" : c.valeur().trim();
        return switch (c.type()) {
            case IMMATRICULE -> "Être immatriculé à la CNPS";
            case PREIMMATRICULE -> "Être préimmatriculé à la CNPS";
            case COTISATION_MINIMUM -> "Avoir cotisé au moins " + v + " FCFA (cotisations validées)";
            case STATUT_ADHERENT -> "Avoir le statut " + String.join(" ou ", liste(v));
            case ANCIENNETE_MOIS_MIN -> "Avoir au moins " + v + " mois d'ancienneté";
            case AGE_MIN -> "Avoir au moins " + v + " ans";
            case PACK -> "Être au pack " + String.join(" ou ", liste(v));
            case DROITS_COUVERTS -> "Avoir des droits couverts à ce jour";
            case AYANT_DROIT -> "Avoir un ayant droit de type " + v.toLowerCase(Locale.ROOT);
            case ENFANT_AGE_MAX -> "Avoir un enfant de " + v + " ans ou moins";
            case ARCHIVAGE_COMPLET -> "Avoir un dossier CNPS dont l'archivage est complet";
        };
    }

    private static Set<String> liste(String valeur) {
        if (valeur == null) {
            return Set.of();
        }
        return Arrays.stream(valeur.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));
    }

    private static Integer entier(String valeur) {
        try {
            return valeur == null ? null : Integer.valueOf(valeur.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static BigDecimal decimal(String valeur) {
        try {
            return valeur == null ? null : new BigDecimal(valeur.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
