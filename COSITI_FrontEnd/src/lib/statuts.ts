/**
 * COSITI — Correspondance statut métier -> libellé affiché + teinte.
 *
 * SOURCE UNIQUE. Aucun composant ne choisit lui-même la couleur d'un statut,
 * et aucun écran ne traduit un code à la main. On ajoute ici, on consomme
 * partout ailleurs via `<BadgeStatut domaine="paiement" code={p.statut} />`.
 *
 * Les codes proviennent du schéma de l'API (docs backend `01_SCHEMA_BDD.md`,
 * `02_CLASSES_ET_METHODES.md`). Ils sont en SCREAMING_SNAKE_CASE français ;
 * les champs JSON, eux, sont en camelCase français.
 *
 * Règle d'accessibilité : la teinte ne porte jamais l'information seule. Un
 * badge affiche toujours son libellé — jamais une pastille nue.
 */

/** Les six seules teintes autorisées. Voir `src/styles/tokens.css` §4. */
export type Teinte =
  | "neutre"
  | "info"
  | "succes"
  | "attention"
  | "danger"
  | "marque";

export interface DefinitionStatut {
  /** Libellé français affiché à l'utilisateur. Jamais le code brut. */
  readonly libelle: string;
  readonly teinte: Teinte;
  /** Phrase d'explication, pour une infobulle ou une aide contextuelle. */
  readonly aide?: string;
}

type TableStatuts = Readonly<Record<string, DefinitionStatut>>;

/* ==========================================================================
   1. Adhérents et droits
   ======================================================================== */

const ADHERENT = {
  PREINSCRIT: { libelle: "Préinscrit", teinte: "neutre", aide: "Dossier créé, aucune cotisation encore enregistrée." },
  ACTIF: { libelle: "Actif", teinte: "succes" },
  EN_RETARD: { libelle: "En retard", teinte: "attention" },
  INACTIF: { libelle: "Inactif", teinte: "neutre" },
  REACTIVE: { libelle: "Réactivé", teinte: "succes" },
  RADIE: { libelle: "Radié", teinte: "danger" },
} satisfies TableStatuts;

const REGULARITE = {
  A_JOUR: { libelle: "À jour", teinte: "succes" },
  PARTIELLEMENT_A_JOUR: { libelle: "Partiellement à jour", teinte: "attention" },
  EN_RETARD: { libelle: "En retard", teinte: "attention" },
  /**
   * Volontairement en rouge : sur 172 adhérents, 115 n'ont jamais cotisé.
   * C'est l'indicateur central du projet, il ne doit pas se fondre dans le reste.
   */
  JAMAIS_COTISE: { libelle: "Jamais cotisé", teinte: "danger" },
} satisfies TableStatuts;

const PERIODE_DROITS = {
  COUVERTE: { libelle: "Couverte", teinte: "succes" },
  PARTIELLE: { libelle: "Partielle", teinte: "attention" },
  /**
   * Ajouté au jalon J6 : code réel de
   * `cm.cositi.api.droits.entite.StatutPeriode` (backend), absent de la
   * version précédente de cette table — complété, pas redéfini (même
   * traitement que `PAIEMENT.INCOHERENCE` en J4).
   */
  ANNULEE: { libelle: "Annulée", teinte: "danger", aide: "Période invalidée par une annulation de paiement." },
} satisfies TableStatuts;

/* ==========================================================================
   2. Cotisations et caisse
   ======================================================================== */

const PAIEMENT = {
  BROUILLON: { libelle: "Brouillon", teinte: "neutre" },
  A_CONTROLER: { libelle: "À contrôler", teinte: "attention", aide: "En attente du contrôle DAF." },
  VALIDE: { libelle: "Validé", teinte: "succes" },
  RAPPROCHE: { libelle: "Rapproché", teinte: "succes" },
  ANNULE: { libelle: "Annulé", teinte: "danger", aide: "Annulation motivée et auditée." },
  /**
   * Ajouté au jalon J4 : code réel de `cm.cositi.api.cotisation.entite.StatutPaiement`
   * (backend), absent de la version précédente de cette table. Complète le
   * registre plutôt que de le redéfinir (`docs/02_DESIGN_SYSTEM.md §17`).
   */
  INCOHERENCE: { libelle: "Incohérence signalée", teinte: "danger", aide: "Une incohérence a été signalée par le DAF." },
  /** Module cotisations #17 (V18) : rejet définitif et motivé, distinct de l'annulation. */
  REJETE: { libelle: "Rejeté", teinte: "danger", aide: "Rejet définitif et motivé par un validateur." },
} satisfies TableStatuts;

/** Bilan journalier de caisse (module cotisations #30 à #33, `StatutBilanCaisse`). */
const BILAN_CAISSE = {
  SAISI: { libelle: "Saisi — à valider", teinte: "attention", aide: "Montant physique saisi, en attente de la décision du DAF." },
  VALIDE: { libelle: "Validé", teinte: "succes", aide: "Validé par le DAF — définitif." },
  ANOMALIE: { libelle: "Anomalie signalée", teinte: "danger", aide: "La caisse doit être recomptée puis ressaisie." },
} satisfies TableStatuts;

/**
 * Workflow Maker–Checker (V19). Statut de validation d'un dossier adhérent ou d'un profil d'agent — distinct
 * du statut métier (ACTIF, EN_RETARD…). Le libellé est toujours écrit : la couleur ne suffit jamais (§57).
 */
const STATUT_VALIDATION = {
  BROUILLON: { libelle: "Brouillon — non soumis", teinte: "neutre", aide: "Saisie en cours : modifiable, puis à soumettre pour validation." },
  EN_ATTENTE_VALIDATION: { libelle: "En attente de validation", teinte: "attention", aide: "Soumis : aucune modification directe jusqu'à la décision." },
  CORRECTION_DEMANDEE: { libelle: "Correction demandée", teinte: "attention", aide: "Le validateur demande une correction avant resoumission." },
  VALIDE: { libelle: "Validé — officiel", teinte: "succes", aide: "Donnée officielle : toute modification passe par une demande." },
  REJETE: { libelle: "Rejeté", teinte: "danger", aide: "Refusé : à corriger puis soumettre de nouveau." },
} satisfies TableStatuts;

/** Cycle d'une demande de validation ou de modification. */
const STATUT_DEMANDE = {
  BROUILLON: { libelle: "Brouillon", teinte: "neutre" },
  EN_ATTENTE_VALIDATION: { libelle: "En attente de validation", teinte: "attention" },
  CORRECTION_DEMANDEE: { libelle: "Correction demandée", teinte: "attention" },
  APPROUVEE: { libelle: "Approuvée — appliquée", teinte: "succes" },
  REJETEE: { libelle: "Rejetée", teinte: "danger" },
  ANNULEE: { libelle: "Annulée", teinte: "neutre" },
} satisfies TableStatuts;

/** Type d'une demande (`TypeOperationWorkflow`). */
const OPERATION_WORKFLOW = {
  ADHERENT_VALIDATION_DOSSIER: { libelle: "Validation de dossier adhérent", teinte: "info" },
  ADHERENT_MODIFICATION: { libelle: "Modification d'adhérent", teinte: "info" },
  AGENT_VALIDATION_PROFIL: { libelle: "Validation de profil d'agent", teinte: "info" },
  AGENT_MODIFICATION: { libelle: "Modification d'agent", teinte: "info" },
  AGENT_CHANGEMENT_STATUT: { libelle: "Changement de statut d'agent", teinte: "info" },
  PAIEMENT_CORRECTION: { libelle: "Correction de cotisation", teinte: "info" },
} satisfies TableStatuts;

/** Transition enregistrée sur une demande (`ActionWorkflow`). */
const ACTION_WORKFLOW = {
  CREATION: { libelle: "Demande créée", teinte: "neutre" },
  SOUMISSION: { libelle: "Soumise", teinte: "info" },
  RESOUMISSION: { libelle: "Resoumise après correction", teinte: "info" },
  APPROBATION: { libelle: "Approuvée", teinte: "succes" },
  REJET: { libelle: "Rejetée", teinte: "danger" },
  DEMANDE_CORRECTION: { libelle: "Correction demandée", teinte: "attention" },
  ANNULATION: { libelle: "Annulée", teinte: "neutre" },
} satisfies TableStatuts;

/** Étapes de l'historique d'un paiement (`TypeOperation`, #18). */
const OPERATION_PAIEMENT = {
  PAIEMENT_CREATION: { libelle: "Saisie", teinte: "info" },
  PAIEMENT_SOUMISSION: { libelle: "Soumission à validation", teinte: "info" },
  PAIEMENT_VALIDATION: { libelle: "Validation", teinte: "succes" },
  PAIEMENT_REJET: { libelle: "Rejet", teinte: "danger" },
  PAIEMENT_CORRECTION: { libelle: "Correction", teinte: "attention" },
  PAIEMENT_ANNULATION: { libelle: "Annulation", teinte: "danger" },
  PAIEMENT_RAPPROCHEMENT: { libelle: "Rapprochement", teinte: "succes" },
  PAIEMENT_CONFIRMATION_CHEF: { libelle: "Confirmation du Chef", teinte: "info" },
  PAIEMENT_SIGNALEMENT_INCOHERENCE: { libelle: "Incohérence signalée", teinte: "danger" },
} satisfies TableStatuts;

const MODE_PAIEMENT = {
  ESPECES: { libelle: "Espèces", teinte: "neutre" },
  ORANGE_MONEY: { libelle: "Orange Money", teinte: "neutre" },
  MTN_MOMO: { libelle: "MTN MoMo", teinte: "neutre" },
  VIREMENT: { libelle: "Virement", teinte: "neutre" },
} satisfies TableStatuts;

const REMISE_CAISSE = {
  DECLAREE: { libelle: "Déclarée", teinte: "info" },
  RECUE: { libelle: "Reçue", teinte: "succes" },
  EN_ECART: { libelle: "En écart", teinte: "danger", aide: "Le montant reçu diffère du montant déclaré." },
  CLOTUREE: { libelle: "Clôturée", teinte: "neutre" },
} satisfies TableStatuts;

/* ==========================================================================
   3. CNPS
   ======================================================================== */

const DOSSIER_CNPS = {
  BROUILLON: { libelle: "Brouillon", teinte: "neutre" },
  INCOMPLET: { libelle: "Incomplet", teinte: "attention", aide: "Des pièces obligatoires manquent." },
  PRET: { libelle: "Prêt", teinte: "info" },
  TRANSMIS: { libelle: "Transmis", teinte: "info" },
  TRAITE: { libelle: "Traité", teinte: "succes" },
  REJETE: { libelle: "Rejeté", teinte: "danger" },
} satisfies TableStatuts;

const PIECE_CNPS = {
  ATTENDUE: { libelle: "Attendue", teinte: "attention" },
  FOURNIE: { libelle: "Fournie", teinte: "info" },
  VALIDEE: { libelle: "Validée", teinte: "succes" },
  REJETEE: { libelle: "Rejetée", teinte: "danger" },
} satisfies TableStatuts;

/* ==========================================================================
   4. Documents
   ======================================================================== */

const DOCUMENT = {
  AJOUTE: { libelle: "Ajouté", teinte: "neutre" },
  VERIFIE: { libelle: "Vérifié", teinte: "succes" },
  REJETE: { libelle: "Rejeté", teinte: "danger" },
  ARCHIVE: { libelle: "Archivé", teinte: "neutre" },
  /** V21 : version remplacée par une plus récente, conservée pour l'historique. */
  REMPLACE: { libelle: "Remplacé", teinte: "neutre", aide: "Ancienne version, conservée — plus la version active." },
} satisfies TableStatuts;

const ANALYSE_ANTIVIRUS = {
  EN_ATTENTE: { libelle: "Analyse en cours", teinte: "info" },
  PROPRE: { libelle: "Fichier sain", teinte: "succes" },
  INFECTE: { libelle: "Fichier infecté", teinte: "danger", aide: "Le fichier ne peut pas être téléchargé." },
} satisfies TableStatuts;

/* ==========================================================================
   5. Comptes rendus, rapports, relances
   ======================================================================== */

const COMPTE_RENDU = {
  BROUILLON: { libelle: "Brouillon", teinte: "neutre" },
  CONTROLE: { libelle: "Contrôlé", teinte: "info" },
  CONSOLIDE: { libelle: "Consolidé", teinte: "info" },
  TRANSMIS: { libelle: "Transmis", teinte: "succes" },
} satisfies TableStatuts;

const RAPPORT_DAF = {
  BROUILLON: { libelle: "Brouillon", teinte: "neutre" },
  PRODUIT: { libelle: "Produit", teinte: "info" },
  TRANSMIS: { libelle: "Transmis au PCA", teinte: "succes" },
} satisfies TableStatuts;

const RESULTAT_RELANCE = {
  PROMESSE: { libelle: "Promesse", teinte: "info" },
  PAIEMENT: { libelle: "Paiement", teinte: "succes" },
  INJOIGNABLE: { libelle: "Injoignable", teinte: "attention" },
  REFUS: { libelle: "Refus", teinte: "danger" },
  DEMENAGE: { libelle: "Déménagé", teinte: "attention" },
  ABSENT: { libelle: "Absent", teinte: "attention" },
} satisfies TableStatuts;

/**
 * Cycle de vie d'une campagne de relance. Ajouté au jalon J8 : codes réels de
 * `cm.cositi.api.relance.entite.StatutCampagne` (backend), absents de la
 * version précédente de cette table — complété, pas redéfini.
 */
const CAMPAGNE_RELANCE = {
  ACTIVE: { libelle: "Active", teinte: "succes", aide: "La campagne accepte de nouvelles relances." },
  SUSPENDUE: { libelle: "Suspendue", teinte: "attention" },
  CLOTUREE: {
    libelle: "Clôturée",
    teinte: "neutre",
    aide: "Aucune nouvelle relance ne peut y être rattachée, et elle ne peut pas être rouverte.",
  },
} satisfies TableStatuts;

const CANAL_RELANCE = {
  APPEL: { libelle: "Appel", teinte: "neutre" },
  SMS: { libelle: "SMS", teinte: "neutre" },
  WHATSAPP: { libelle: "WhatsApp", teinte: "neutre" },
  VISITE: { libelle: "Visite", teinte: "neutre" },
} satisfies TableStatuts;

/* ==========================================================================
   6. Paramètres — marqueurs de validation du cahier des charges
   ======================================================================== */

const VALIDATION_PARAMETRE = {
  C: { libelle: "Confirmé", teinte: "succes", aide: "Règle confirmée par la COSITI." },
  A: { libelle: "À analyser", teinte: "info", aide: "Proposition technique, à confirmer par le chef de projet." },
  V: {
    libelle: "À valider",
    teinte: "attention",
    aide: "Règle non validée par la COSITI. La valeur utilisée est provisoire et paramétrable.",
  },
} satisfies TableStatuts;

/**
 * Opérations du journal d'audit d'un adhérent (`TypeOperation` backend, entité `adherent`), affichées
 * dans l'onglet Historique de la fiche (#21). Un type inconnu s'affiche tel quel, en neutre.
 */
const OPERATION_ADHERENT = {
  ADHERENT_CREATION: { libelle: "Création", teinte: "succes" },
  ADHERENT_MODIFICATION: { libelle: "Modification de la fiche", teinte: "info" },
  ADHERENT_ARCHIVAGE: { libelle: "Archivage", teinte: "danger" },
  ADHERENT_CHANGEMENT_STATUT: { libelle: "Changement de statut", teinte: "attention" },
  ADHERENT_CHANGEMENT_PACK: { libelle: "Changement de pack", teinte: "attention" },
  ADHERENT_DOUBLON_IGNORE: {
    libelle: "Doublon signalé et ignoré",
    teinte: "attention",
    aide: "La création a été confirmée malgré un doublon potentiel détecté par le serveur.",
  },
  ADHERENT_COMPLETION_PROFIL: { libelle: "Complétion du dossier", teinte: "info" },
  ADHERENT_MODIFICATION_PROFESSIONNELLE: { libelle: "Informations professionnelles", teinte: "info" },
  ADHERENT_MODIFICATION_CONTACT: { libelle: "Coordonnées", teinte: "info" },
  // Workflow V19 : application d'une décision de validation sur le dossier.
  ADHERENT_VALIDATION_DOSSIER: { libelle: "Dossier validé (officiel)", teinte: "succes" },
  DEMANDE_VALIDATION_APPLICATION: { libelle: "Modification approuvée appliquée", teinte: "succes" },
} satisfies TableStatuts;

/**
 * État d'un agent de terrain (`agent.actif` backend, exposé en booléen) : l'écran traduit le booléen en
 * `ACTIF`/`INACTIF` pour passer par `BadgeStatut`, jamais par un libellé écrit à la main.
 */
const AGENT = {
  ACTIF: { libelle: "Actif", teinte: "succes" },
  INACTIF: { libelle: "Inactif", teinte: "neutre", aide: "Agent désactivé : il n'apparaît plus dans la répartition des portefeuilles." },
} satisfies TableStatuts;

/** Opérations du journal d'audit d'un agent (`TypeOperation`, entité `agent`) — onglet Activité (#7, #23). */
const OPERATION_AGENT = {
  AGENT_CREATION_PAR_DGA: { libelle: "Création par la DGA", teinte: "succes" },
  AGENT_MODIFICATION: { libelle: "Modification du profil", teinte: "info" },
  AGENT_CHANGEMENT_STATUT: { libelle: "Activation / désactivation", teinte: "attention" },
  AGENT_DESIGNATION_CHEF: { libelle: "Désignation comme Chef", teinte: "info" },
  AGENT_REMPLACEMENT_CHEF: { libelle: "Remplacement du Chef", teinte: "attention" },
  PORTEFEUILLE_AFFECTATION: { libelle: "Affectation d'un adhérent", teinte: "info" },
  PORTEFEUILLE_TRANSFERT: { libelle: "Transfert d'un adhérent", teinte: "attention" },
  PORTEFEUILLE_RETRAIT: { libelle: "Retrait d'un adhérent", teinte: "attention" },
  AGENT_VALIDATION_PROFIL: { libelle: "Profil validé (officiel)", teinte: "succes" },
  DEMANDE_VALIDATION_APPLICATION: { libelle: "Modification approuvée appliquée", teinte: "succes" },
} satisfies TableStatuts;

/* ==========================================================================
   7. Registre et résolution
   ======================================================================== */

/* ==========================================================================
   Parcours d'adhésion (V20) : frais, activation, contrôle documentaire DGA
   ======================================================================== */

/** `StatutFraisAdhesion` — cycle du frais d'adhésion de 1 000 FCFA (montant lu du serveur). */
const FRAIS_ADHESION = {
  ENREGISTRE: { libelle: "Enregistré — à valider", teinte: "attention", aide: "Encaissement saisi par le Gestionnaire, en attente de la validation du DAF." },
  VALIDE: { libelle: "Encaissement validé", teinte: "succes", aide: "Encaissement confirmé par un autre utilisateur habilité." },
  ANOMALIE: { libelle: "Anomalie signalée", teinte: "danger", aide: "Anomalie à résoudre, avec motif, avant toute validation." },
} satisfies TableStatuts;

/** `StatutControleDga` porté par l'adhérent — distinct du statut du compte (un adhérent peut être actif et en attente DGA). */
const CONTROLE_DGA_ADHERENT = {
  NON_SOUMIS: { libelle: "Non transmis à la DGA", teinte: "neutre", aide: "Le dossier n'a pas encore été transmis au contrôle documentaire." },
  EN_ATTENTE_DGA: { libelle: "En attente de contrôle DGA", teinte: "attention", aide: "Activé et transmis : dans la file de la DGA." },
  EN_VERIFICATION: { libelle: "Contrôle DGA en cours", teinte: "info", aide: "La DGA compare les informations avec les documents physiques." },
  CORRECTION_DEMANDEE: { libelle: "Correction demandée par la DGA", teinte: "attention", aide: "Le Gestionnaire corrige le dossier puis le retransmet." },
  VALIDE: { libelle: "Documents conformes", teinte: "succes", aide: "Contrôle DGA validé : dossier officiel." },
  REJETE: { libelle: "Rejeté par la DGA", teinte: "danger", aide: "Contrôle documentaire rejeté, décision motivée." },
} satisfies TableStatuts;

/** `StatutControle` — un tour de contrôle DGA. */
const TOUR_CONTROLE_DGA = {
  EN_ATTENTE: { libelle: "En attente", teinte: "attention" },
  EN_COURS: { libelle: "En cours", teinte: "info" },
  CORRECTION_DEMANDEE: { libelle: "Correction demandée", teinte: "attention" },
  VALIDE: { libelle: "Validé", teinte: "succes" },
  REJETE: { libelle: "Rejeté", teinte: "danger" },
} satisfies TableStatuts;

/** `StatutCorrespondance` — information COSITI comparée au document physique. */
const CORRESPONDANCE = {
  CORRESPOND: { libelle: "Correspond", teinte: "succes" },
  NON_CORRESPOND: { libelle: "Ne correspond pas", teinte: "danger", aide: "Anomalie : la valeur lue sur le document diffère." },
  NON_VERIFIABLE: { libelle: "Non vérifiable", teinte: "neutre", aide: "Information absente du document : non bloquant." },
  NON_LISIBLE: { libelle: "Illisible", teinte: "danger", aide: "Anomalie : document illisible." },
  DOCUMENT_MANQUANT: { libelle: "Document manquant", teinte: "danger", aide: "Anomalie : document non fourni." },
  NON_APPLICABLE: { libelle: "Non applicable", teinte: "neutre", aide: "Information sans objet pour cet adhérent : ni anomalie, ni motif." },
} satisfies TableStatuts;

/** Statut calculé d'une pièce de la checklist documentaire (V21, `StatutPiece`). */
const STATUT_PIECE = {
  REQUIS: { libelle: "Requise — non fournie", teinte: "danger", aide: "Pièce obligatoire à fournir." },
  NON_FOURNI: { libelle: "Non fournie", teinte: "neutre", aide: "Pièce conditionnelle ou facultative non fournie." },
  FOURNI: { libelle: "Fournie — à contrôler", teinte: "info", aide: "Déposée, pas encore contrôlée par la DGA." },
  EN_VERIFICATION: { libelle: "En vérification DGA", teinte: "info" },
  VALIDE: { libelle: "Contrôlée — conforme", teinte: "succes" },
  NON_CONFORME: { libelle: "Non conforme", teinte: "danger", aide: "Au moins une information ne correspond pas : remplacer la pièce ou corriger le dossier." },
  ILLISIBLE: { libelle: "Illisible", teinte: "danger", aide: "Fournir une copie lisible." },
  EXPIRE: { libelle: "Expirée", teinte: "danger", aide: "Date de fin de validité dépassée : fournir une pièce en cours de validité." },
  REMPLACE: { libelle: "Remplacée", teinte: "neutre" },
  NON_APPLICABLE: { libelle: "Non applicable", teinte: "neutre" },
} satisfies TableStatuts;

/** Caractère d'une pièce dans la matrice documentaire (V21, `NiveauExigence`). */
const NIVEAU_EXIGENCE = {
  OBLIGATOIRE: { libelle: "Obligatoire", teinte: "marque" },
  CONDITIONNELLE: { libelle: "Conditionnelle", teinte: "info" },
  OPTIONNELLE: { libelle: "Facultative", teinte: "neutre" },
  NON_APPLICABLE: { libelle: "Non applicable", teinte: "neutre" },
} satisfies TableStatuts;

/** Décision finale de la DGA sur un tour de contrôle. */
const DECISION_CONTROLE_DGA = {
  VALIDER: { libelle: "Valider le dossier", teinte: "succes" },
  DEMANDER_CORRECTION: { libelle: "Demander une correction", teinte: "attention" },
  REJETER: { libelle: "Rejeter", teinte: "danger" },
} satisfies TableStatuts;

/** Nature d'un écart du rapprochement des frais. */
const ECART_FRAIS = {
  SANS_FRAIS: { libelle: "Frais non enregistré", teinte: "danger", aide: "Dossier soumis à la DGA sans frais d'adhésion enregistré." },
  MONTANT_DIFFERENT: { libelle: "Montant différent", teinte: "attention", aide: "Montant reçu différent du montant attendu." },
  ANOMALIE_SIGNALEE: { libelle: "Anomalie signalée", teinte: "danger" },
} satisfies TableStatuts;

/** Statut d'un document dans un tour de contrôle DGA (`controle_dga_document.statut`). */
const DOCUMENT_CONTROLE = {
  A_VERIFIER: { libelle: "À vérifier", teinte: "neutre" },
  CONFORME: { libelle: "Conforme", teinte: "succes" },
  ANOMALIE: { libelle: "Anomalie", teinte: "danger" },
} satisfies TableStatuts;

/** Opérations auditées du parcours d'adhésion (`TypeOperation`, V20) — journal du contrôle et historique de l'adhérent. */
const OPERATION_ADHESION = {
  FRAIS_ADHESION_ENREGISTREMENT: { libelle: "Frais d'adhésion enregistré", teinte: "info" },
  FRAIS_ADHESION_VALIDATION: { libelle: "Encaissement du frais validé", teinte: "succes" },
  FRAIS_ADHESION_ANOMALIE_SIGNALEE: { libelle: "Anomalie de frais signalée", teinte: "danger" },
  FRAIS_ADHESION_ANOMALIE_RESOLUE: { libelle: "Anomalie de frais résolue", teinte: "succes" },
  ADHERENT_ACTIVATION: { libelle: "Adhérent activé", teinte: "succes" },
  ADHERENT_SOUMISSION_DGA: { libelle: "Transmis au contrôle DGA", teinte: "info" },
  CONTROLE_DGA_DEMARRAGE: { libelle: "Contrôle DGA démarré", teinte: "info" },
  CONTROLE_DGA_CHAMP_VERIFIE: { libelle: "Information vérifiée", teinte: "succes" },
  CONTROLE_DGA_NON_CONCORDANCE: { libelle: "Anomalie documentaire", teinte: "danger" },
  CONTROLE_DGA_CORRECTION_DEMANDEE: { libelle: "Correction demandée par la DGA", teinte: "attention" },
  CONTROLE_DGA_TERMINE: { libelle: "Contrôle DGA terminé", teinte: "marque" },
  // V21
  CONTROLE_DGA_RECONTROLE: { libelle: "Recontrôle DGA ouvert", teinte: "attention" },
  DOCUMENT_REMPLACEMENT: { libelle: "Pièce remplacée", teinte: "info" },
  DOCUMENT_VERIFICATION_DGA: { libelle: "Pièce vérifiée par la DGA", teinte: "succes" },
} satisfies TableStatuts;

export const STATUTS = {
  adherent: ADHERENT,
  regularite: REGULARITE,
  periodeDroits: PERIODE_DROITS,
  paiement: PAIEMENT,
  modePaiement: MODE_PAIEMENT,
  remiseCaisse: REMISE_CAISSE,
  dossierCnps: DOSSIER_CNPS,
  pieceCnps: PIECE_CNPS,
  document: DOCUMENT,
  analyseAntivirus: ANALYSE_ANTIVIRUS,
  compteRendu: COMPTE_RENDU,
  rapportDaf: RAPPORT_DAF,
  resultatRelance: RESULTAT_RELANCE,
  canalRelance: CANAL_RELANCE,
  campagneRelance: CAMPAGNE_RELANCE,
  validationParametre: VALIDATION_PARAMETRE,
  // L'historique d'un adhérent inclut les étapes de son parcours d'adhésion (V20).
  operationAdherent: { ...OPERATION_ADHERENT, ...OPERATION_ADHESION },
  agent: AGENT,
  operationAgent: OPERATION_AGENT,
  bilanCaisse: BILAN_CAISSE,
  operationPaiement: OPERATION_PAIEMENT,
  statutValidation: STATUT_VALIDATION,
  statutDemande: STATUT_DEMANDE,
  operationWorkflow: OPERATION_WORKFLOW,
  actionWorkflow: ACTION_WORKFLOW,
  fraisAdhesion: FRAIS_ADHESION,
  controleDgaAdherent: CONTROLE_DGA_ADHERENT,
  tourControleDga: TOUR_CONTROLE_DGA,
  correspondance: CORRESPONDANCE,
  decisionControleDga: DECISION_CONTROLE_DGA,
  ecartFrais: ECART_FRAIS,
  documentControle: DOCUMENT_CONTROLE,
  statutPiece: STATUT_PIECE,
  niveauExigence: NIVEAU_EXIGENCE,
  operationAdhesion: OPERATION_ADHESION,
} as const;

export type DomaineStatut = keyof typeof STATUTS;

const STATUT_ABSENT: DefinitionStatut = { libelle: "—", teinte: "neutre" };

/**
 * Résout un code de statut. Ne lève jamais : un code inconnu (API en avance sur
 * le frontend) s'affiche tel quel en teinte neutre plutôt que de casser l'écran.
 */
export function definitionStatut(
  domaine: DomaineStatut,
  code: string | null | undefined,
): DefinitionStatut {
  if (!code) return STATUT_ABSENT;
  const table: TableStatuts = STATUTS[domaine];
  return table[code] ?? { libelle: code, teinte: "neutre" };
}

/**
 * Classes Tailwind par teinte. Unique endroit où une teinte devient des
 * classes : `BadgeStatut`, `Alerte` et les cellules de tableau lisent ici.
 */
export const CLASSES_TEINTE: Readonly<Record<Teinte, string>> = {
  neutre: "bg-neutre-doux text-neutre-fort border-neutre-trait",
  info: "bg-info-doux text-info-fort border-info-trait",
  succes: "bg-succes-doux text-succes-fort border-succes-trait",
  attention: "bg-attention-doux text-attention-fort border-attention-trait",
  danger: "bg-danger-doux text-danger-fort border-danger-trait",
  // Aplat de marque : réservé à l'action prioritaire, jamais à un état métier.
  marque: "bg-marque text-marque-contenu border-transparent",
};

/**
 * Pastille d'icône (cercle d'une ligne de liste, d'une notification) : surface
 * douce + encre forte, sans bordure. `identite` = pastille de marque du gabarit —
 * fond vert foncé, icône orange —, qui ne porte aucun état.
 */
export const CLASSES_PASTILLE_TEINTE: Readonly<Record<Teinte | "identite", string>> = {
  neutre: "bg-neutre-doux text-neutre-fort",
  info: "bg-info-doux text-info-fort",
  succes: "bg-succes-doux text-succes-fort",
  attention: "bg-attention-doux text-attention-fort",
  danger: "bg-danger-doux text-danger-fort",
  marque: "bg-marque text-marque-contenu",
  identite: "bg-surface-inversee text-surface-inversee-accent",
};

/**
 * Remplissage d'une barre de progression. `primaire` (vert) par défaut ;
 * `marque` pour la mesure prioritaire. Une barre ne porte jamais seule sa
 * valeur : `BarreProgression` écrit toujours le chiffre.
 */
export const CLASSES_REMPLISSAGE: Readonly<Record<"primaire" | "marque" | "info" | "danger", string>> = {
  primaire: "bg-primaire",
  marque: "bg-marque",
  info: "bg-info-fort",
  danger: "bg-danger-fort",
};
