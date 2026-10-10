package cm.cositi.api.adherent.entite;

/**
 * État du contrôle documentaire DGA d'un adhérent (colonne {@code statut_controle_dga}, V20). Distinct du statut
 * métier ({@code ACTIF}…) et du statut de validation du dossier : un adhérent peut être actif et en attente DGA.
 */
public enum StatutControleDga {
    /** Jamais soumis au contrôle (dossiers antérieurs à V20, ou pas encore activés). */
    NON_SOUMIS,
    /** Activé par le Gestionnaire et transmis : en file DGA. */
    EN_ATTENTE_DGA,
    /** Contrôle démarré par la DGA (libellé du document des règles v2.0, §5). */
    EN_VERIFICATION,
    /** La DGA a demandé une correction : le Gestionnaire corrige puis resoumet. */
    CORRECTION_DEMANDEE,
    /** Documents conformes : dossier officiel. */
    VALIDE,
    /** Contrôle rejeté. */
    REJETE;

    public boolean enCours() {
        return this == EN_ATTENTE_DGA || this == EN_VERIFICATION;
    }
}
