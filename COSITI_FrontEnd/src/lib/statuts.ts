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

/* ==========================================================================
   7. Registre et résolution
   ======================================================================== */

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
