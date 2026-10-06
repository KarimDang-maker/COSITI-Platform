package cm.cositi.api.cotisation.service;

import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.cotisation.entite.OrigineRepartition;
import cm.cositi.api.parametre.ServiceParametre;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Règle de répartition d'une cotisation entre le compte Sécurité sociale et le compte Épargne (règles module 2 §2 à
 * §4, prompt §9). Seul endroit où la répartition est validée : saisie, correction d'un brouillon, demande de
 * correction et affectation à la validation s'y rangent toutes.
 *
 * <ul>
 *   <li>invariant : total = Sécurité sociale + Épargne (aussi garanti en base, V22) ;</li>
 *   <li>Sécurité sociale &ge; {@code MONTANT_MINIMUM_SECURITE_SOCIALE} (700, confirmé) ;</li>
 *   <li>Épargne &ge; {@code MONTANT_MINIMUM_EPARGNE} (300) lorsqu'elle est alimentée ; une Épargne nulle est acceptée
 *       tant que {@code EPARGNE_FACULTATIVE_PAR_COTISATION} vaut {@code true} (condition « lorsque la cotisation
 *       alimente ce compte » non précisée : paramètre [V]) ;</li>
 *   <li>aucun plafond, ni pour la Sécurité sociale ni pour l'Épargne : il n'est pas défini, il n'est pas inventé.</li>
 * </ul>
 */
@Component
public class RegleRepartitionCotisation {

    static final String CLE_MINIMUM_SECURITE_SOCIALE = "MONTANT_MINIMUM_SECURITE_SOCIALE";
    static final String CLE_MINIMUM_EPARGNE = "MONTANT_MINIMUM_EPARGNE";
    static final String CLE_EPARGNE_FACULTATIVE = "EPARGNE_FACULTATIVE_PAR_COTISATION";

    private final ServiceParametre serviceParametre;
    private final JdbcTemplate jdbcTemplate;

    public RegleRepartitionCotisation(ServiceParametre serviceParametre, JdbcTemplate jdbcTemplate) {
        this.serviceParametre = serviceParametre;
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Répartition retenue pour une cotisation. */
    public record Repartition(BigDecimal securiteSociale, BigDecimal epargne, OrigineRepartition origine) {
    }

    /** Seuils en vigueur, exposés tels quels au frontend : il ne les code jamais en dur. */
    public record Seuils(BigDecimal minimumSecuriteSociale, BigDecimal minimumEpargne, boolean epargneFacultative,
                         List<String> avertissements) {
    }

    public Seuils seuils() {
        List<String> avertissements = new ArrayList<>();
        if (!serviceParametre.estValide(CLE_EPARGNE_FACULTATIVE)) {
            avertissements.add("Les cas où une cotisation peut ne rien verser à l'Épargne ne sont pas encore validés "
                    + "par la COSITI (EPARGNE_FACULTATIVE_PAR_COTISATION).");
        }
        return new Seuils(serviceParametre.decimal(CLE_MINIMUM_SECURITE_SOCIALE),
                serviceParametre.decimal(CLE_MINIMUM_EPARGNE), serviceParametre.booleen(CLE_EPARGNE_FACULTATIVE),
                avertissements);
    }

    /**
     * Répartition à enregistrer : celle saisie si elle est fournie (les deux montants ou aucun), sinon la préférence
     * active de l'adhérent pour ce montant, sinon la règle par défaut (minimum Sécurité sociale, reste à l'Épargne).
     * Dans tous les cas, le résultat est validé — une proposition du serveur qui enfreint une règle est refusée avec
     * la même erreur explicite qu'une saisie.
     */
    public Repartition determiner(BigDecimal montant, BigDecimal securiteSociale, BigDecimal epargne,
                                  UUID adherentId) {
        if (securiteSociale == null && epargne == null) {
            Repartition proposee = preference(adherentId, montant);
            if (proposee == null) {
                BigDecimal minimum = serviceParametre.decimal(CLE_MINIMUM_SECURITE_SOCIALE);
                proposee = new Repartition(minimum.min(montant), montant.subtract(minimum.min(montant)),
                        OrigineRepartition.PROPOSITION_SERVEUR);
            }
            valider(montant, proposee.securiteSociale(), proposee.epargne());
            return proposee;
        }
        if (securiteSociale == null || epargne == null) {
            throw new ExceptionValidation("COTISATION_REPARTITION_INCOMPLETE",
                    "Renseignez à la fois le montant Sécurité sociale et le montant Épargne (ou aucun des deux).",
                    securiteSociale == null ? "montantSecuriteSociale" : "montantEpargne");
        }
        valider(montant, securiteSociale, epargne);
        return new Repartition(securiteSociale, epargne, OrigineRepartition.SAISIE);
    }

    /** Lève une {@link ExceptionValidation} explicite si la répartition ne respecte pas les règles en vigueur. */
    public void valider(BigDecimal montant, BigDecimal securiteSociale, BigDecimal epargne) {
        if (montant == null || montant.signum() <= 0) {
            throw new ExceptionValidation("PAIEMENT_MONTANT_INVALIDE", "Le montant doit être strictement positif.",
                    "montant");
        }
        if (securiteSociale.signum() < 0 || epargne.signum() < 0) {
            throw new ExceptionValidation("COTISATION_REPARTITION_INVALIDE",
                    "Les montants Sécurité sociale et Épargne ne peuvent pas être négatifs.",
                    securiteSociale.signum() < 0 ? "montantSecuriteSociale" : "montantEpargne");
        }
        if (securiteSociale.scale() > 2 || epargne.scale() > 2) {
            throw new ExceptionValidation("COTISATION_REPARTITION_INVALIDE",
                    "Les montants ne peuvent pas avoir plus de deux décimales.", "montantSecuriteSociale");
        }
        BigDecimal minimumSecuriteSociale = serviceParametre.decimal(CLE_MINIMUM_SECURITE_SOCIALE);
        if (montant.compareTo(minimumSecuriteSociale) < 0) {
            throw new ExceptionValidation("COTISATION_MONTANT_INSUFFISANT",
                    "Le montant de la cotisation (" + montant + " FCFA) est inférieur au minimum de "
                            + minimumSecuriteSociale + " FCFA à affecter à la Sécurité sociale.", "montant");
        }
        if (securiteSociale.add(epargne).compareTo(montant) != 0) {
            throw new ExceptionValidation("COTISATION_REPARTITION_INCOHERENTE",
                    "La répartition (Sécurité sociale " + securiteSociale + " + Épargne " + epargne + " = "
                            + securiteSociale.add(epargne) + " FCFA) doit être égale au montant total (" + montant
                            + " FCFA).", "montant");
        }
        if (securiteSociale.compareTo(minimumSecuriteSociale) < 0) {
            throw new ExceptionValidation("COTISATION_SECURITE_SOCIALE_INSUFFISANTE",
                    "Le montant affecté à la Sécurité sociale (" + securiteSociale + " FCFA) doit être d'au moins "
                            + minimumSecuriteSociale + " FCFA.", "montantSecuriteSociale");
        }
        BigDecimal minimumEpargne = serviceParametre.decimal(CLE_MINIMUM_EPARGNE);
        boolean epargneFacultative = serviceParametre.booleen(CLE_EPARGNE_FACULTATIVE);
        boolean epargneAlimentee = epargne.signum() > 0;
        if ((epargneAlimentee || !epargneFacultative) && epargne.compareTo(minimumEpargne) < 0) {
            throw new ExceptionValidation("COTISATION_EPARGNE_INSUFFISANTE",
                    "Le montant affecté à l'Épargne (" + epargne + " FCFA) doit être d'au moins " + minimumEpargne
                            + " FCFA" + (epargneFacultative ? " lorsque la cotisation alimente ce compte, ou nul." : "."),
                    "montantEpargne");
        }
    }

    /** Préférence d'allocation active de l'adhérent (V14), appliquée seulement si elle porte sur ce montant. */
    private Repartition preference(UUID adherentId, BigDecimal montant) {
        if (adherentId == null) {
            return null;
        }
        List<Repartition> lignes = jdbcTemplate.query("""
                        SELECT allocation_securite_sociale, allocation_epargne FROM preference_allocation_adherent
                        WHERE adherent_id = ? AND actif = true AND montant_reference = ?""",
                (rs, i) -> new Repartition(rs.getBigDecimal("allocation_securite_sociale"),
                        rs.getBigDecimal("allocation_epargne"), OrigineRepartition.PROPOSITION_SERVEUR),
                adherentId, montant);
        return lignes.isEmpty() ? null : lignes.get(0);
    }
}
