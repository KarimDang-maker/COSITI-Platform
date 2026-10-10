/**
 * COSITI — Domaine « Avantages » : catalogue des droits et couvertures (prestations CNPS ou avantages propres à la
 * COSITI), bénéficiaires par avantage et évaluation par adhérent.
 *
 * Contrat : `COSITI_Backend/src/main/java/cm/cositi/api/avantage/`. Aucune règle métier ici (`AGENTS.md` règle 2) :
 * l'éligibilité, les seuils (âge, ancienneté, cumul) et les statuts sont calculés par le moteur côté serveur ; l'écran
 * affiche la réponse. Permissions : `AVANTAGE:LIRE`, `AVANTAGE:RECALCULER`, `AVANTAGE:GERER`.
 */
import { client } from "@/api/client";

export type StatutAvantage = "ACQUIS" | "EN_COURS" | "NON_ELIGIBLE" | "SUSPENDU";

export const STATUTS_AVANTAGE: readonly { valeur: StatutAvantage; libelle: string }[] = [
  { valeur: "ACQUIS", libelle: "Acquis" },
  { valeur: "EN_COURS", libelle: "En cours d'acquisition" },
  { valeur: "SUSPENDU", libelle: "Suspendu" },
  { valeur: "NON_ELIGIBLE", libelle: "Non éligible" },
];

export type BrancheAvantage = "PRESTATIONS_FAMILIALES" | "PENSIONS" | "RISQUES_PROFESSIONNELS" | "COSITI";

export const BRANCHES_AVANTAGE: readonly { valeur: BrancheAvantage; libelle: string }[] = [
  { valeur: "PRESTATIONS_FAMILIALES", libelle: "Prestations familiales" },
  { valeur: "PENSIONS", libelle: "Pensions" },
  { valeur: "RISQUES_PROFESSIONNELS", libelle: "Risques professionnels" },
  { valeur: "COSITI", libelle: "Avantages COSITI" },
];

export type TypeCritere =
  | "IMMATRICULE"
  | "PREIMMATRICULE"
  | "COTISATION_MINIMUM"
  | "STATUT_ADHERENT"
  | "ANCIENNETE_MOIS_MIN"
  | "AGE_MIN"
  | "PACK"
  | "DROITS_COUVERTS"
  | "AYANT_DROIT"
  | "ENFANT_AGE_MAX"
  | "ARCHIVAGE_COMPLET";

/**
 * Types de critères reconnus par le moteur (`TypeCritere`). `avecValeur` reflète `exigeValeur()` côté serveur ; les
 * seuils eux-mêmes sont des données du catalogue, jamais écrites ici.
 */
export const TYPES_CRITERE: readonly { type: TypeCritere; libelle: string; avecValeur: boolean; aide?: string }[] = [
  { type: "IMMATRICULE", libelle: "Immatriculé à la CNPS", avecValeur: false },
  { type: "PREIMMATRICULE", libelle: "Au moins préimmatriculé", avecValeur: false },
  { type: "COTISATION_MINIMUM", libelle: "Cumul de cotisations minimum", avecValeur: true, aide: "Montant en FCFA" },
  { type: "STATUT_ADHERENT", libelle: "Statut de l'adhérent", avecValeur: true, aide: "Codes séparés par une virgule, ex. ACTIF,REACTIVE" },
  { type: "ANCIENNETE_MOIS_MIN", libelle: "Ancienneté minimum (mois)", avecValeur: true, aide: "Nombre de mois" },
  { type: "AGE_MIN", libelle: "Âge minimum", avecValeur: true, aide: "Nombre d'années" },
  { type: "PACK", libelle: "Pack souscrit", avecValeur: true, aide: "Codes séparés par une virgule, ex. PACK_700,PACK_1000" },
  { type: "DROITS_COUVERTS", libelle: "Droits couverts à ce jour", avecValeur: false },
  { type: "AYANT_DROIT", libelle: "Ayant droit déclaré", avecValeur: true, aide: "CONJOINT ou ENFANT" },
  { type: "ENFANT_AGE_MAX", libelle: "Enfant ayant droit (âge maximum)", avecValeur: true, aide: "Nombre d'années" },
  { type: "ARCHIVAGE_COMPLET", libelle: "Archivage du dossier CNPS complet", avecValeur: false },
];

export type CategoriePiece = "CONSTITUTION" | "MAINTIEN";

export const CATEGORIES_PIECE: readonly { valeur: CategoriePiece; libelle: string }[] = [
  { valeur: "CONSTITUTION", libelle: "Constitution du dossier" },
  { valeur: "MAINTIEN", libelle: "Maintien des droits" },
];

export interface Critere {
  readonly type: TypeCritere;
  readonly valeur: string | null;
  /** Libellé lisible produit par le serveur. */
  readonly libelle: string | null;
}

export interface PieceAvantage {
  readonly categorie: CategoriePiece;
  readonly libelle: string;
}

/** `AvantageDto` : un avantage du catalogue avec ses critères, ses pièces et ses effectifs. */
export interface Avantage {
  readonly id: string;
  readonly code: string;
  readonly libelle: string;
  readonly branche: BrancheAvantage;
  readonly description: string | null;
  readonly actif: boolean;
  /** Marqueur C/A/V du cahier des charges (V = règle à valider par la COSITI). */
  readonly statutValidation: "C" | "A" | "V";
  readonly criteres: readonly Critere[];
  readonly pieces: readonly PieceAvantage[];
  readonly nbAcquis: number;
  readonly nbEnCours: number;
  readonly nbSuspendus: number;
}

/** `AvantageAdherentDto` : un avantage vu depuis la fiche d'un adhérent. */
export interface AvantageAdherent {
  readonly avantageId: string;
  readonly code: string;
  readonly libelle: string;
  readonly branche: BrancheAvantage;
  readonly statut: StatutAvantage;
  readonly statutValidation: "C" | "A" | "V";
  readonly criteresSatisfaits: readonly string[];
  readonly criteresManquants: readonly string[];
  readonly dateDebut: string | null;
  readonly dateFin: string | null;
  readonly pieces: readonly PieceAvantage[];
}

export interface Beneficiaire {
  readonly adherentId: string;
  readonly matricule: string;
  readonly nomComplet: string;
  readonly zoneId: string | null;
  readonly statut: StatutAvantage;
  readonly criteresManquants: readonly string[];
  readonly dateDebut: string | null;
}

export interface ResultatRecalcul {
  readonly adherentsEvalues: number;
  readonly avantagesEvalues: number;
  readonly changements: number;
}

export interface CorpsCritere {
  type: TypeCritere;
  valeur?: string;
}

export interface CorpsAvantage {
  code: string;
  libelle: string;
  branche: BrancheAvantage;
  description?: string;
  actif: boolean;
  criteres: CorpsCritere[];
  pieces: PieceAvantage[];
}

function parametres(filtres: Record<string, unknown>): string {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    requete.set(cle, String(valeur));
  }
  const texte = requete.toString();
  return texte ? `?${texte}` : "";
}

export function listerAvantages(inclureInactifs = false) {
  return client.get<Avantage[]>(`/avantages${parametres({ inclureInactifs: inclureInactifs || undefined })}`);
}

export function obtenirAvantage(id: string) {
  return client.get<Avantage>(`/avantages/${id}`);
}

export function creerAvantage(corps: CorpsAvantage) {
  return client.post<Avantage>("/avantages", corps);
}

export function modifierAvantage(id: string, corps: CorpsAvantage) {
  return client.put<Avantage>(`/avantages/${id}`, corps);
}

/** Sans `statut`, le serveur renvoie les bénéficiaires `ACQUIS`. */
export function listerBeneficiaires(avantageId: string, statut?: StatutAvantage, zoneId?: string) {
  return client.get<Beneficiaire[]>(`/avantages/${avantageId}/beneficiaires${parametres({ statut, zoneId })}`);
}

export function recalculerAvantages() {
  return client.post<ResultatRecalcul>("/avantages/recalculer");
}

export function listerAvantagesAdherent(adherentId: string) {
  return client.get<AvantageAdherent[]>(`/adherents/${adherentId}/avantages`);
}
