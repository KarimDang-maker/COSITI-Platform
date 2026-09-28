package cm.cositi.api.audit;

/** Nomenclature des types d'opération d'audit — voir docs/01_SCHEMA_BDD.md §7. */
public enum TypeOperation {
    ADHERENT_CREATION,
    ADHERENT_MODIFICATION,
    ADHERENT_ARCHIVAGE,
    ADHERENT_CHANGEMENT_STATUT,
    ADHERENT_CHANGEMENT_PACK,
    ADHERENT_DOUBLON_IGNORE,
    /** Saisie préparatoire par l'Agent de terrain — jamais une création définitive (correctif §5). */
    ADHERENT_PREINSCRIPTION,
    /** Complète le profil et ouvre le pack/l'allocation d'un adhérent {@code PREINSCRIT} — réservé Gestionnaire. */
    ADHERENT_FINALISATION,
    PREFERENCE_ALLOCATION_ENREGISTREMENT,
    RECOMMANDATION_ALLOCATION_ENREGISTREMENT,
    AGENT_CREATION_PAR_DGA,
    AGENT_DESIGNATION_CHEF,
    AGENT_REMPLACEMENT_CHEF,
    PORTEFEUILLE_AFFECTATION,
    PORTEFEUILLE_TRANSFERT,
    /** RAPORT_V1.md §6.5 : proposition d'objectif de recouvrement (Gestionnaire, Chef des agents de terrain). */
    OBJECTIF_RECOUVREMENT_PROPOSITION,
    /** RAPORT_V1.md §6.5/§6.11 : arbitrage DGA (approbation ou rejet, jamais modification de la proposition). */
    OBJECTIF_RECOUVREMENT_DECISION,
    /** RAPORT_V1.md §6.3/§7.2 : changement de pack/allocation proposé par la Gestionnaire. */
    ALLOCATION_CHANGEMENT_PROPOSITION,
    /** RAPORT_V1.md §6.3/§7.2/§6.11 : décision du DAF sur une proposition de changement d'allocation. */
    ALLOCATION_CHANGEMENT_DECISION,
    PAIEMENT_CREATION,
    PAIEMENT_VALIDATION,
    PAIEMENT_CORRECTION,
    PAIEMENT_ANNULATION,
    PAIEMENT_RAPPROCHEMENT,
    PAIEMENT_CONFIRMATION_CHEF,
    PAIEMENT_SIGNALEMENT_INCOHERENCE,
    AFFECTATION_CREATION,
    DROITS_IMPUTATION,
    DROITS_RECALCUL,
    REMISE_CAISSE_DECLARATION,
    REMISE_CAISSE_RECEPTION,
    REMISE_CAISSE_ECART,
    CNPS_DOSSIER_CREATION,
    CNPS_PIECE_AJOUT,
    CNPS_CHANGEMENT_STATUT,
    /** Module Gestionnaire des comptes — dossiers de prestation CNPS (observations/relance modifiées). */
    CNPS_OBSERVATIONS_MODIFICATION,
    CNPS_DECLARATION_TRANSMISE,
    DOCUMENT_TELEVERSEMENT,
    DOCUMENT_CONSULTATION,
    DOCUMENT_SUPPRESSION_LOGIQUE,
    RELANCE_ENREGISTREMENT,
    COMPTE_RENDU_CREATION,
    COMPTE_RENDU_CONSOLIDATION,
    COMPTE_RENDU_TRANSMISSION,
    RAPPORT_DAF_PRODUCTION,
    RAPPORT_DAF_TRANSMISSION,
    UTILISATEUR_CREATION,
    UTILISATEUR_DESACTIVATION,
    ROLE_MODIFICATION,
    PERMISSION_MODIFICATION,
    PARAMETRE_MODIFICATION,
    CONNEXION_SUCCES,
    CONNEXION_ECHEC,
    COMPTE_VERROUILLE,
    RAFRAICHISSEMENT_JETON,
    DECONNEXION,
    MOT_DE_PASSE_CHANGEMENT,
    EXPORT_SENSIBLE,
    /** Génération du rapport d'audit en PDF — réservée Super Administrateur (correctif §3), toujours auditée. */
    AUDIT_EXPORT_PDF,
    ACCES_REFUSE,
    MIGRATION_IMPORT
}
