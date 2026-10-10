package cm.cositi.api.avantage;

/**
 * Types de critères reconnus par le moteur d'avantages. Un critère est une donnée du catalogue ({@code
 * critere_avantage}) : seul le <b>sens</b> de chaque type est dans le code, jamais les seuils ni les valeurs.
 */
public enum TypeCritere {
    /** Numéro d'immatriculation CNPS attribué. */
    IMMATRICULE(false),
    /** Au moins préimmatriculé (préimmatriculation faite, dossier déposé ou immatriculation). */
    PREIMMATRICULE(false),
    /** Cumul de cotisations validées supérieur ou égal à la valeur (FCFA). */
    COTISATION_MINIMUM(true),
    /** Statut de l'adhérent parmi la liste donnée (ex. ACTIF,REACTIVE). */
    STATUT_ADHERENT(true),
    /** Ancienneté d'adhésion d'au moins N mois. */
    ANCIENNETE_MOIS_MIN(true),
    /** Âge de l'adhérent d'au moins N ans. */
    AGE_MIN(true),
    /** Pack parmi la liste donnée (ex. PACK_700,PACK_1000). */
    PACK(true),
    /** Une période de droits couvre aujourd'hui. */
    DROITS_COUVERTS(false),
    /** Au moins un ayant droit du lien donné (CONJOINT ou ENFANT). */
    AYANT_DROIT(true),
    /** Au moins un enfant ayant droit de N ans ou moins. */
    ENFANT_AGE_MAX(true),
    /** Checklist d'archivage du dossier CNPS complète. */
    ARCHIVAGE_COMPLET(false);

    private final boolean avecValeur;

    TypeCritere(boolean avecValeur) {
        this.avecValeur = avecValeur;
    }

    public boolean exigeValeur() {
        return avecValeur;
    }
}
