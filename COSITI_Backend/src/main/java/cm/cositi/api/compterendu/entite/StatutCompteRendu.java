package cm.cositi.api.compterendu.entite;

/**
 * Cycle de vie d'un compte rendu (colonne {@code compte_rendu.statut}, V10).
 *
 * <p>Deux parcours, selon le type :</p>
 * <pre>
 *   TERRAIN    : BROUILLON --(transmettre)--> TRANSMIS --(controler)--> CONTROLE --(consolider)--> CONSOLIDE
 *   CONSOLIDE  : BROUILLON --(transmettre)--> TRANSMIS
 * </pre>
 *
 * <p>Un compte rendu terrain n'est consolidable qu'une fois contrôlé : c'est la raison d'être du contrôle
 * (UC-GC-13, « données exploitables »). Une fois consolidé, il est figé — le modifier changerait
 * rétroactivement un consolidé déjà transmis à la DGA.</p>
 */
public enum StatutCompteRendu {
    BROUILLON,
    TRANSMIS,
    CONTROLE,
    CONSOLIDE;

    public boolean estModifiable() {
        return this == BROUILLON;
    }

    public boolean estConsolidable() {
        return this == CONTROLE;
    }
}
