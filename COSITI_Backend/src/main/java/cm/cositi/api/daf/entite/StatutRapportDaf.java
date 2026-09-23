package cm.cositi.api.daf.entite;

/**
 * Cycle de vie d'un rapport DAF (colonne {@code rapport_daf.statut}, V12).
 *
 * <pre>BROUILLON --(produire)--> PRODUIT --(transmettre)--> TRANSMIS</pre>
 *
 * <p>{@code TRANSMIS} est terminal : un rapport mis à disposition du PCA ne se retire pas et ne se
 * réécrit pas. Corriger un rapport transmis consiste à en produire un nouveau.</p>
 */
public enum StatutRapportDaf {
    BROUILLON,
    PRODUIT,
    TRANSMIS;

    public boolean estVisibleDuPca() {
        return this == TRANSMIS;
    }
}
