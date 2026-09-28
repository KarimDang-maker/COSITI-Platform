package cm.cositi.api.cnps.entite;

import java.util.EnumSet;
import java.util.Set;

/**
 * Colonne {@code dossier_prestation_cnps.statut} (V16). Statuts repris des captures (« Incomplet »,
 * « Transmis CNPS ») et alignés sur le cycle déjà en place pour {@link StatutDossierCnps} (immatriculation),
 * pour rester cohérent au sein du module CNPS — décision technique documentée, pas une règle CNPS validée
 * (même réserve que pour {@code StatutDossierCnps}, voir {@code Conception/SUIVI_EXECUTION.md}).
 *
 * <pre>
 *   INCOMPLET ─→ COMPLET ─→ TRANSMIS_CNPS ─→ TRAITE
 *                                 │
 *                                 └──→ REJETE ──→ INCOMPLET
 * </pre>
 */
public enum StatutDossierPrestationCnps {
    INCOMPLET,
    COMPLET,
    TRANSMIS_CNPS,
    TRAITE,
    REJETE;

    public Set<StatutDossierPrestationCnps> transitionsAutorisees() {
        return switch (this) {
            case INCOMPLET -> EnumSet.of(COMPLET);
            case COMPLET -> EnumSet.of(TRANSMIS_CNPS, INCOMPLET);
            case TRANSMIS_CNPS -> EnumSet.of(TRAITE, REJETE);
            case REJETE -> EnumSet.of(INCOMPLET);
            case TRAITE -> EnumSet.noneOf(StatutDossierPrestationCnps.class);
        };
    }

    public boolean peutAllerVers(StatutDossierPrestationCnps cible) {
        return transitionsAutorisees().contains(cible);
    }

    /** États à partir desquels le dossier est parti à la CNPS : ses pièces ne bougent plus. */
    public boolean estFige() {
        return this == TRANSMIS_CNPS || this == TRAITE;
    }
}
