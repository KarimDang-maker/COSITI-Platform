package cm.cositi.api.commun.util;

import cm.cositi.api.commun.exception.ExceptionValidation;

import java.math.BigDecimal;

/**
 * Règle unique de répartition Sécurité Sociale / Épargne (correctif COSITI V1 §7-§8, paramètre
 * {@code REPARTITION_VERSEMENT} désormais confirmé — voir {@code Conception/SUIVI_EXECUTION.md}).
 *
 * <p>Partagée entre le module {@code adherent} (préférence d'allocation enregistrée au dossier) et le module
 * {@code cotisation} (recommandation structurée saisie par l'agent, ventilation appliquée à la validation d'un
 * paiement) — utilitaire sans état plutôt qu'un service, pour ne pas créer de dépendance directe entre les deux
 * modules (docs/02_CLASSES_ET_METHODES.md §1).</p>
 *
 * <p>Le minimum Sécurité Sociale lui-même n'est jamais une constante Java : il est lu dans {@code parametre}
 * ({@code MONTANT_MINIMUM_SECURITE_SOCIALE}, statut {@code C}) par l'appelant et passé ici en paramètre.</p>
 */
public final class ValidationAllocation {

    private ValidationAllocation() {
    }

    /**
     * Vérifie que {@code securiteSociale + epargne == montantTotal} et que
     * {@code securiteSociale >= minimumSecuriteSociale}. Lève {@code ExceptionValidation} avec un message métier
     * explicite (jamais une exception générique) sinon — §7 : « DOIT être refusée ».
     */
    public static void verifier(BigDecimal montantTotal, BigDecimal securiteSociale, BigDecimal epargne,
                                 BigDecimal minimumSecuriteSociale) {
        if (montantTotal == null || securiteSociale == null || epargne == null) {
            throw new ExceptionValidation("ALLOCATION_INCOMPLETE",
                    "Le montant total, l'allocation Sécurité Sociale et l'allocation Épargne sont tous obligatoires.");
        }
        if (securiteSociale.signum() < 0 || epargne.signum() < 0) {
            throw new ExceptionValidation("ALLOCATION_MONTANT_NEGATIF",
                    "Une allocation ne peut pas être négative.");
        }
        BigDecimal somme = securiteSociale.add(epargne);
        if (somme.compareTo(montantTotal) != 0) {
            throw new ExceptionValidation("ALLOCATION_SOMME_INVALIDE",
                    "Sécurité Sociale (" + securiteSociale + ") + Épargne (" + epargne
                            + ") = " + somme + ", ce qui ne correspond pas au montant total (" + montantTotal
                            + " FCFA). La somme des deux comptes doit toujours égaler le montant du paiement.");
        }
        if (securiteSociale.compareTo(minimumSecuriteSociale) < 0) {
            throw new ExceptionValidation("ALLOCATION_SECURITE_SOCIALE_INSUFFISANTE",
                    "L'allocation Sécurité Sociale (" + securiteSociale + " FCFA) est inférieure au minimum "
                            + "obligatoire de " + minimumSecuriteSociale + " FCFA. Le système empêche toute "
                            + "allocation qui ferait descendre la Sécurité Sociale sous ce seuil.");
        }
    }

    /**
     * Répartition par défaut quand aucune préférence/recommandation ne s'applique : Sécurité Sociale au minimum
     * fixe, le reste en Épargne (exemples §7 : pack 700 → 700/0 ; pack 1000 → 700/300). Refuse si le montant ne
     * couvre même pas le minimum Sécurité Sociale — un montant de paiement doit être au moins ce plancher.
     */
    public static BigDecimal[] repartitionParDefaut(BigDecimal montantTotal, BigDecimal minimumSecuriteSociale) {
        if (montantTotal.compareTo(minimumSecuriteSociale) < 0) {
            throw new ExceptionValidation("ALLOCATION_MONTANT_INSUFFISANT",
                    "Le montant (" + montantTotal + " FCFA) est inférieur au minimum requis pour la Sécurité "
                            + "Sociale (" + minimumSecuriteSociale + " FCFA) — aucune allocation valide n'est possible.");
        }
        BigDecimal epargne = montantTotal.subtract(minimumSecuriteSociale);
        return new BigDecimal[]{minimumSecuriteSociale, epargne};
    }
}
