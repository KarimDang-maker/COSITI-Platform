/**
 * COSITI — Domaine « Relances et campagnes » (J8).
 *
 * Contrat vérifié dans le code backend réel (`cm.cositi.api.relance`).
 *
 * **Écart signalé avec `03_SPECIFICATIONS_API.md §10`** : le pack décrit
 * `POST /relances` puis `POST /relances/{id}/resultat` en deux temps. Le backend
 * livré n'expose qu'un seul appel, qui enregistre le contact **et** son
 * résultat — sur le terrain, l'agent saisit après coup, et `relance.resultat`
 * est `NOT NULL` au schéma (V4). Une relance sans résultat n'existe pas.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";

/** `CanalRelance` (backend). Domaine `canalRelance` de `src/lib/statuts.ts`. */
export type CanalRelance = "APPEL" | "SMS" | "WHATSAPP" | "VISITE";

/** `ResultatRelance` (backend). Domaine `resultatRelance` de `src/lib/statuts.ts`. */
export type ResultatRelance =
  | "PROMESSE"
  | "PAIEMENT"
  | "INJOIGNABLE"
  | "REFUS"
  | "DEMENAGE"
  | "ABSENT";

/** `StatutCampagne` (backend). */
export type StatutCampagne = "ACTIVE" | "SUSPENDUE" | "CLOTUREE";

/**
 * Résultats qui appellent un nouveau contact : le serveur exige alors une date de prochaine action
 * (`RELANCE_SUIVI_REQUIS`). Repris ici pour marquer le champ obligatoire **au bon moment** dans le
 * formulaire, pas pour se substituer au contrôle serveur.
 */
export const RESULTATS_AVEC_SUIVI: readonly ResultatRelance[] = ["PROMESSE", "INJOIGNABLE", "ABSENT"];

export interface Relance {
  readonly id: string;
  readonly adherentId: string;
  readonly campagneId: string | null;
  readonly responsableUtilisateurId: string | null;
  readonly canal: CanalRelance;
  readonly dateContact: string;
  readonly resultat: ResultatRelance;
  readonly prochaineActionLe: string | null;
  readonly commentaire: string | null;
}

export interface CampagneRelance {
  readonly id: string;
  readonly libelle: string;
  /** Critères conservés tels qu'ils ont été choisis : une trace, jamais un moteur de ciblage. */
  readonly critereJson: string;
  readonly dateDebut: string;
  readonly dateFin: string | null;
  readonly statut: StatutCampagne;
  readonly nbRelances: number;
  readonly creeLe: string;
  readonly creePar: string | null;
}

export interface SaisieRelance {
  adherentId: string;
  campagneId?: string;
  canal: CanalRelance;
  resultat: ResultatRelance;
  prochaineActionLe?: string;
  commentaire?: string;
}

function parametres(valeurs: Record<string, unknown>): string {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(valeurs)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    requete.set(cle, String(valeur));
  }
  const texte = requete.toString();
  return texte ? `?${texte}` : "";
}

export function listerRelances(filtres: { campagneId?: string; page?: number; taille?: number }) {
  return client.get<EnveloppeListe<Relance>>(`/relances${parametres({ ...filtres })}`);
}

export function listerRelancesAdherent(adherentId: string) {
  return client.get<Relance[]>(`/adherents/${adherentId}/relances`);
}

export function enregistrerRelance(saisie: SaisieRelance) {
  return client.post<Relance>("/relances", saisie);
}

export function listerCampagnes(filtres: { statut?: StatutCampagne; page?: number; taille?: number }) {
  return client.get<EnveloppeListe<CampagneRelance>>(`/campagnes-relance${parametres({ ...filtres })}`);
}

export function creerCampagne(libelle: string, critere: Record<string, unknown>, dateDebut?: string) {
  return client.post<CampagneRelance>("/campagnes-relance", { libelle, critere, dateDebut });
}

export function changerStatutCampagne(id: string, statut: StatutCampagne) {
  return client.post<CampagneRelance>(
    `/campagnes-relance/${id}/statut${parametres({ statut })}`,
    undefined,
  );
}
