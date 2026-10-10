package cm.cositi.api.cnps.entite;

import java.util.EnumSet;
import java.util.Set;

/**
 * Colonne {@code dossier_cnps.statut} (V4__cnps_documents_relances.sql).
 *
 * <p><b>Décision d'implémentation (jalon J7)</b> : V4 énumère les six états mais ne documente aucun chemin
 * entre eux, et {@code Roles des acteurs.md} n'en décrit pas non plus. Le graphe ci-dessous est donc une
 * décision technique explicite, pas une règle CNPS validée — elle est reprise dans
 * {@code Conception/SUIVI_EXECUTION.md} pour confirmation par la COSITI. Elle se contente d'interdire ce qui
 * serait manifestement incohérent (revenir en arrière après transmission, modifier un dossier traité) sans
 * inventer d'étape supplémentaire :</p>
 *
 * <pre>
 *   BROUILLON ─→ INCOMPLET ─→ PRET ─→ TRANSMIS ─→ TRAITE
 *       │            ↑         │         │
 *       └────────────┴─────────┘         └──→ REJETE ──→ INCOMPLET
 * </pre>
 *
 * <p>{@code TRAITE} est terminal : un dossier immatriculé ne se rouvre pas. {@code REJETE} par la CNPS
 * revient à {@code INCOMPLET}, l'état où l'on complète les pièces.</p>
 */
public enum StatutDossierCnps {
    BROUILLON,
    INCOMPLET,
    PRET,
    TRANSMIS,
    TRAITE,
    REJETE;

    public Set<StatutDossierCnps> transitionsAutorisees() {
        return switch (this) {
            case BROUILLON -> EnumSet.of(INCOMPLET, PRET);
            case INCOMPLET -> EnumSet.of(PRET, BROUILLON);
            case PRET -> EnumSet.of(TRANSMIS, INCOMPLET);
            case TRANSMIS -> EnumSet.of(TRAITE, REJETE);
            case REJETE -> EnumSet.of(INCOMPLET);
            case TRAITE -> EnumSet.noneOf(StatutDossierCnps.class);
        };
    }

    public boolean peutAllerVers(StatutDossierCnps cible) {
        return transitionsAutorisees().contains(cible);
    }

    /** États à partir desquels le dossier est parti à la CNPS : ses pièces ne bougent plus. */
    public boolean estFige() {
        return this == TRANSMIS || this == TRAITE;
    }
}
