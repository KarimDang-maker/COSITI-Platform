package cm.cositi.api.historique;

/**
 * Qui peut voir un événement de l'historique, en plus du droit de lire le dossier (prompt §17-§18). Exprimé en
 * permissions, jamais en rôles : la matrice {@code role_permission} reste la seule source.
 */
public enum VisibiliteEvenement {
    /** Tout lecteur autorisé de l'historique concerné. */
    PUBLIC(null),
    /** Détail du contrôle documentaire de la DGA (démarrage, vérification champ par champ, non-concordances). */
    CONTROLE_DGA("CONTROLE_DGA:LIRE"),
    /** Dossier CNPS : immatriculation, pièces, télédéclaration. */
    CNPS("CNPS:LIRE"),
    /**
     * Travail interne de la DAF (anomalies de frais, rapprochement, recalcul des droits, reliquats) : lisible par les
     * porteurs de {@code RAPPORT_DAF:LIRE} (DAF et directions), pas par le Gestionnaire des comptes.
     */
    INTERNE_DAF("RAPPORT_DAF:LIRE");

    private final String permissionRequise;

    VisibiliteEvenement(String permissionRequise) {
        this.permissionRequise = permissionRequise;
    }

    public String permissionRequise() {
        return permissionRequise;
    }
}
