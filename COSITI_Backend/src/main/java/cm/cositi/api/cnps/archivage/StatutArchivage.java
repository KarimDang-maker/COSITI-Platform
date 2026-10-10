package cm.cositi.api.cnps.archivage;

import java.util.EnumSet;
import java.util.Set;

/** Avancement d'une pièce dans la checklist d'archivage du dossier d'immatriculation. */
public enum StatutArchivage {
    NON_FOURNIE,
    FOURNIE,
    VERIFIEE,
    ARCHIVEE;

    public Set<StatutArchivage> transitionsAutorisees() {
        return switch (this) {
            case NON_FOURNIE -> EnumSet.of(FOURNIE);
            case FOURNIE -> EnumSet.of(FOURNIE, VERIFIEE, NON_FOURNIE);
            case VERIFIEE -> EnumSet.of(VERIFIEE, ARCHIVEE, FOURNIE, NON_FOURNIE);
            case ARCHIVEE -> EnumSet.of(ARCHIVEE, NON_FOURNIE);
        };
    }

    /** Une pièce vérifiée ou archivée compte comme prête pour l'immatriculation. */
    public boolean estPrete() {
        return this == VERIFIEE || this == ARCHIVEE;
    }
}
