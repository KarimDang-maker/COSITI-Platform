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
  readonly zoneLibelle?: string;
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
  return client.get<EnveloppeListe<Adherent>>(`/adherents${requete ? `?${requete}` : ""}`);
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

export interface CorpsVerificationDoublon {
  nom: string;
  prenoms?: string;
  telephonePrincipal: string;
  numeroCni?: string;
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
