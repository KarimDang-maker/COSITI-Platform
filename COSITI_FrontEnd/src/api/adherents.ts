/**
 * COSITI — Domaine « Adhérents » (J2).
 *
 * Types et appels alignés sur `COSITI_Backend/docs/01_SCHEMA_BDD.md §« adherent »`
 * et `03_SPECIFICATIONS_API.md §3`. Aucun calcul ici : ce fichier transporte,
 * il ne décide ni n'agrège rien.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";

export type StatutAdherent = "PREINSCRIT" | "ACTIF" | "EN_RETARD" | "INACTIF" | "REACTIVE" | "RADIE";
export type Sexe = "M" | "F";

export interface Adherent {
  readonly id: string;
  readonly matricule: string;
  readonly nom: string;
  readonly prenoms: string | null;
  readonly dateNaissance: string | null;
  readonly sexe: Sexe | null;
  readonly telephonePrincipal: string;
  readonly telephoneSecondaire: string | null;
  readonly numeroCni: string | null;
  readonly numeroCnps: string | null;
  readonly activiteId: string;
  readonly activiteNom?: string;
  readonly zoneId: string;
  readonly zoneLibelle: string | null;
  readonly associationId: string | null;
  readonly localisation: string;
  readonly quartier: string | null;
  readonly ville: string | null;
  readonly dateAdhesion: string;
  readonly statut: StatutAdherent;
  readonly inscriptionPayee: boolean;
  /** Champ de cache toléré pour l'affichage — l'agent référent réel vit dans `affectation_portefeuille` (`01_SCHEMA_BDD.md`). */
  readonly agentReferentNom?: string | null;
}

/**
 * Ligne de la liste des adhérents — forme renvoyée par `GET /adherents` (`AdherentResumeDto`).
 *
 * Distincte d'{@link Adherent}, qui décrit la fiche complète. Les confondre était un défaut réel :
 * l'écran lisait `nom`, `prenoms` et `dateAdhesion`, qui n'existent pas dans la réponse de liste,
 * et affichait donc un tiret dans les colonnes « Adhérent », « Zone » et « Adhésion » pour
 * chaque ligne. Constaté en recette E2E au jalon J12.
 */
export interface AdherentResume {
  readonly id: string;
  readonly matricule: string;
  readonly nomComplet: string;
  readonly telephonePrincipal: string;
  readonly zoneId: string;
  readonly zoneLibelle: string | null;
  readonly dateAdhesion: string;
  readonly statut: StatutAdherent;
}

export interface FiltresAdherents {
  recherche?: string;
  zoneId?: string;
  agentId?: string;
  activiteId?: string;
  statut?: StatutAdherent;
  packId?: string;
  associationId?: string;
  sansAgentReferent?: boolean;
  dateAdhesionDu?: string;
  dateAdhesionAu?: string;
  page?: number;
  taille?: number;
  tri?: string;
}

function construireParametres(filtres: FiltresAdherents): string {
  const parametres = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    parametres.set(cle, String(valeur));
  }
  return parametres.toString();
}

export function listerAdherents(filtres: FiltresAdherents) {
  const requete = construireParametres(filtres);
  return client.get<EnveloppeListe<AdherentResume>>(`/adherents${requete ? `?${requete}` : ""}`);
}

export function obtenirAdherent(id: string) {
  return client.get<Adherent>(`/adherents/${id}`);
}

export interface CandidatDoublon {
  readonly adherentId: string;
  readonly matricule: string;
  readonly nomComplet: string;
  /** Toujours partiellement masqué par l'API — ne jamais tenter de le compléter côté client. */
  readonly telephone: string;
  readonly scoreSimilarite: number;
  readonly motifCorrespondance: string;
}

export interface ReponseVerificationDoublon {
  readonly candidats: readonly CandidatDoublon[];
}

/**
 * Contrat réel de `POST /adherents/verifier-doublon` (`VerifierDoublonDto` côté serveur).
 *
 * Corrigé au jalon J12 : le client envoyait `nom` et `prenoms` et **omettait `zoneId`**, qui est
 * obligatoire. L'appel répondait donc `400` à chaque fois et le bandeau informatif de doublon de
 * l'étape 3 ne s'affichait jamais. La détection restait assurée à la création (409), mais
 * l'avertissement préalable — celui qui évite la saisie inutile — était perdu.
 */
export interface CorpsVerificationDoublon {
  nomComplet: string;
  telephonePrincipal?: string;
  numeroCni?: string;
  zoneId: string;
}

export function verifierDoublon(corps: CorpsVerificationDoublon) {
  return client.post<ReponseVerificationDoublon>("/adherents/verifier-doublon", corps);
}

export interface CorpsCreationAdherent {
  nom: string;
  prenoms?: string;
  dateNaissance?: string;
  sexe?: Sexe;
  telephonePrincipal: string;
  telephoneSecondaire?: string;
  numeroCni?: string;
  numeroCnps?: string;
  activiteId: string;
  zoneId: string;
  associationId?: string;
  localisation: string;
  quartier?: string;
  ville?: string;
  dateAdhesion: string;
  packId: string;
  /** Envoyé uniquement après confirmation explicite d'un doublon signalé en 409 (`03_SPECIFICATIONS_API.md §3`). */
  confirmationDoublonIgnore?: boolean;
}

export function creerAdherent(corps: CorpsCreationAdherent) {
  return client.post<Adherent>("/adherents", corps);
}

export function modifierAdherent(id: string, corps: Partial<CorpsCreationAdherent>) {
  return client.put<Adherent>(`/adherents/${id}`, corps);
}

/**
 * La situation de droits d'un adhérent (couvert jusqu'au, jours de retard,
 * cumul cotisé, éligibilité CNPS…) vivait ici depuis J2
 * (`GET /adherents/{id}/situation`, documenté par
 * `03_SPECIFICATIONS_API.md §3`). J6 introduit le domaine `droits` dédié
 * (`§5`, `GET /droits/adherents/{id}`), à la forme de réponse identique :
 * consolidé là-bas plutôt que maintenu en double ici — voir
 * `src/api/droits.ts` et `Conception/SUIVI_EXECUTION.md`.
 */

/** Une activité du référentiel COSITI (table `activite`, sept lignes livrées par la migration V2). */
export interface Activite {
  readonly id: string;
  readonly code: string;
  readonly libelle: string;
  readonly categorie: string;
}

/**
 * Référentiel des activités.
 *
 * `activiteId` est un UUID obligatoire côté API : sans cette liste, l'écran de création ne
 * pouvait proposer qu'une saisie libre que le serveur refusait systématiquement.
 */
export function listerActivites() {
  return client.get<Activite[]>("/activites");
}

/** Un pack de cotisation du référentiel COSITI (table `pack`, deux lignes livrées par la migration V2). */
export interface Pack {
  readonly id: string;
  readonly code: string;
  readonly libelle: string;
  readonly montantJournalier: number;
  readonly montantMensuelEquivalent: number;
  readonly seuilEligibiliteCnps: number;
  readonly actif: boolean;
}

/**
 * Référentiel des packs. Renvoie aussi les packs inactifs (avec leur drapeau) : un adhérent
 * rattaché à un pack retiré du catalogue doit rester affichable. C'est à l'écran de création
 * de n'en proposer que les actifs.
 */
export function listerPacks() {
  return client.get<Pack[]>("/packs");
}
