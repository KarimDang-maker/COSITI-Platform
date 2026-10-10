package cm.cositi.api.cnps.parcours;

/** Étape CNPS d'un adhérent, calculée en direct (jamais saisie à la main). */
public enum EtapeParcours {
    /** Cumul de cotisations validées inférieur au quota de préimmatriculation. */
    NON_ELIGIBLE,
    /** Quota de préimmatriculation atteint, préimmatriculation à faire par la gestionnaire. */
    ELIGIBLE_PREIMMAT,
    /** Préimmatriculé : le dossier physique est à déposer au CPS dans le délai. */
    PREIMMATRICULE,
    DOSSIER_DEPOSE,
    IMMATRICULE
}
