package cm.cositi.api.cnps.parcours;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Règles du parcours CNPS, sans accès base : testables avec n'importe quelle date.
 *
 * <p>Le cumul est celui des cotisations validées ({@code periode_droits} non annulées). Un adhérent déjà
 * préimmatriculé ne revient jamais en arrière, même si les quotas sont relevés ensuite par le DAF.</p>
 */
public final class MoteurParcoursCnps {

    public static final String PERSISTE_PREIMMATRICULE = "PREIMMATRICULE";
    public static final String PERSISTE_DOSSIER_DEPOSE = "DOSSIER_DEPOSE";
    public static final String PERSISTE_IMMATRICULE = "IMMATRICULE";

    private MoteurParcoursCnps() {
    }

    public static FenetrePreimmat fenetre(LocalDate jour, int jourCoupure) {
        return jour.getDayOfMonth() < jourCoupure ? FenetrePreimmat.FENETRE_1 : FenetrePreimmat.FENETRE_2;
    }

    /**
     * @param statutPersiste {@code statut_parcours} stocké, ou {@code null} si l'adhérent n'a pas encore de ligne
     * @param dejaImmatricule vrai si un numéro CNPS existe déjà (fiche adhérent ou dossier), même sans parcours
     */
    public static SituationParcours evaluer(BigDecimal cumul, String statutPersiste, int nbReports,
                                            LocalDate dateLimiteDepot, boolean dejaImmatricule,
                                            ParametresParcours p, LocalDate aujourdhui) {
        BigDecimal cumulSur = cumul == null ? BigDecimal.ZERO : cumul;
        FenetrePreimmat fenetre = fenetre(aujourdhui, p.jourCoupure());
        BigDecimal resteImmat = reste(p.quotaImmat(), cumulSur);

        if (dejaImmatricule || PERSISTE_IMMATRICULE.equals(statutPersiste)) {
            return new SituationParcours(EtapeParcours.IMMATRICULE, fenetre, false, false, false, null, false,
                    BigDecimal.ZERO, BigDecimal.ZERO);
        }
        boolean eligibleImmat = cumulSur.compareTo(p.quotaImmat()) >= 0;

        if (PERSISTE_PREIMMATRICULE.equals(statutPersiste)) {
            Integer jours = dateLimiteDepot == null ? null
                    : (int) ChronoUnit.DAYS.between(aujourdhui, dateLimiteDepot);
            return new SituationParcours(EtapeParcours.PREIMMATRICULE, fenetre, false, false,
                    jours != null && jours < 0, jours, eligibleImmat, BigDecimal.ZERO, resteImmat);
        }
        if (PERSISTE_DOSSIER_DEPOSE.equals(statutPersiste)) {
            return new SituationParcours(EtapeParcours.DOSSIER_DEPOSE, fenetre, false, false, false, null,
                    eligibleImmat, BigDecimal.ZERO, resteImmat);
        }

        boolean eligiblePreimmat = cumulSur.compareTo(p.quotaPreimmat()) >= 0;
        if (eligiblePreimmat) {
            return new SituationParcours(EtapeParcours.ELIGIBLE_PREIMMAT, fenetre, false, nbReports > 0, false,
                    null, eligibleImmat, BigDecimal.ZERO, resteImmat);
        }
        boolean reporte = nbReports > 0;
        boolean enRetard = reporte || fenetre == FenetrePreimmat.FENETRE_2;
        return new SituationParcours(EtapeParcours.NON_ELIGIBLE, fenetre, enRetard, reporte, false, null, false,
                reste(p.quotaPreimmat(), cumulSur), resteImmat);
    }

    private static BigDecimal reste(BigDecimal quota, BigDecimal cumul) {
        BigDecimal diff = quota.subtract(cumul);
        return diff.signum() < 0 ? BigDecimal.ZERO : diff;
    }
}
