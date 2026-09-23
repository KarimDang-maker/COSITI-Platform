package cm.cositi.api.document.entite;

import java.util.EnumSet;
import java.util.Set;

/** Colonne {@code document.statut} (V4). Aucune suppression physique : {@code ARCHIVE} est l'état terminal. */
public enum StatutDocument {
    AJOUTE,
    VERIFIE,
    REJETE,
    ARCHIVE;

    private static final Set<StatutDocument> DEPUIS_AJOUTE = EnumSet.of(VERIFIE, REJETE, ARCHIVE);
    private static final Set<StatutDocument> DEPUIS_VERIFIE = EnumSet.of(REJETE, ARCHIVE);
    private static final Set<StatutDocument> DEPUIS_REJETE = EnumSet.of(ARCHIVE);

    /** Transitions autorisées. {@code ARCHIVE} n'ouvre sur rien : un document archivé ne revient jamais. */
    public Set<StatutDocument> transitionsAutorisees() {
        return switch (this) {
            case AJOUTE -> DEPUIS_AJOUTE;
            case VERIFIE -> DEPUIS_VERIFIE;
            case REJETE -> DEPUIS_REJETE;
            case ARCHIVE -> EnumSet.noneOf(StatutDocument.class);
        };
    }

    public boolean peutAllerVers(StatutDocument cible) {
        return transitionsAutorisees().contains(cible);
    }
}
