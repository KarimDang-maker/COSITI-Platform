package cm.cositi.api.workflow.entite;

import java.util.EnumSet;
import java.util.Set;

/** Cycle d'une demande de validation (§5). Distinct du statut métier de l'entité concernée. */
public enum StatutDemandeValidation {
    BROUILLON,
    EN_ATTENTE_VALIDATION,
    CORRECTION_DEMANDEE,
    APPROUVEE,
    REJETEE,
    ANNULEE;

    /** Statuts d'une demande « ouverte » : une seule par entité (index unique partiel, V19). */
    public static final Set<StatutDemandeValidation> OUVERTS =
            EnumSet.of(BROUILLON, EN_ATTENTE_VALIDATION, CORRECTION_DEMANDEE);

    public boolean estOuvert() {
        return OUVERTS.contains(this);
    }
}
