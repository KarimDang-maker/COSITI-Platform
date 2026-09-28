/**
 * COSITI — Domaine « Comptes rendus » (J8).
 *
 * Chaîne hiérarchique Agent → Gestionnaire des comptes → DGA
 * (`Roles des acteurs.md §12.1`). Contrat marqué `[A]` dans le pack technique :
 * vérifié dans le code backend réel livré dans le même lot
 * (`cm.cositi.api.compterendu`), et **à faire valider formellement par la
 * COSITI** — voir `Conception/SUIVI_EXECUTION.md`.
 *
 * Deux points de contrat repris tels quels côté client :
 *  - les indicateurs sont **déclarés par l'agent**, jamais recalculés depuis les
 *    paiements enregistrés. L'écart entre les deux est précisément ce que le
 *    Gestionnaire examine au contrôle : l'écran ne le masque pas et ne le
 *    corrige pas ;
 *  - un consolidé additionne ses sources côté serveur. Le client n'additionne
 *    rien (`AGENTS.md` règle 2), il affiche le résultat et la liste des sources.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";

/** `TypeCompteRendu` (backend). */
export type TypeCompteRendu = "TERRAIN" | "CONSOLIDE";

/** `StatutCompteRendu` (backend). Domaine `compteRendu` de `src/lib/statuts.ts`. */
export type StatutCompteRendu = "BROUILLON" | "TRANSMIS" | "CONTROLE" | "CONSOLIDE";

export interface CompteRendu {
  readonly id: string;
  readonly type: TypeCompteRendu;
  readonly statut: StatutCompteRendu;
  readonly auteurUtilisateurId: string;
  readonly destinataireUtilisateurId: string | null;
  readonly agentId: string | null;
  readonly zoneId: string | null;
  readonly periodeDebut: string;
  readonly periodeFin: string;
  readonly nbVisites: number;
  readonly nbAdherentsRencontres: number;
  readonly nbAdherentsCrees: number;
  readonly nbPaiementsEnregistres: number;
  readonly montantCollecte: number;
  readonly synthese: string | null;
  readonly difficultes: string | null;
  readonly observationControle: string | null;
  readonly controleLe: string | null;
  readonly controlePar: string | null;
  readonly transmisLe: string | null;
  readonly sourceIds: readonly string[];
  readonly creeLe: string;
  readonly creePar: string | null;
}

export interface SaisieCompteRendu {
  periodeDebut: string;
  periodeFin: string;
  nbVisites: number;
  nbAdherentsRencontres: number;
  nbAdherentsCrees: number;
  nbPaiementsEnregistres: number;
  montantCollecte: number;
  synthese?: string;
  difficultes?: string;
}

export interface FiltresComptesRendus {
  type?: TypeCompteRendu;
  statut?: StatutCompteRendu;
  /** `true` pour la file de travail du destinataire (Gestionnaire, DGA) plutôt que ses propres productions. */
  recus?: boolean;
  page?: number;
  taille?: number;
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

export function listerComptesRendus(filtres: FiltresComptesRendus) {
  return client.get<EnveloppeListe<CompteRendu>>(`/comptes-rendus${parametres({ ...filtres })}`);
}

export function obtenirCompteRendu(id: string) {
  return client.get<CompteRendu>(`/comptes-rendus/${id}`);
}

export function produireCompteRendu(saisie: SaisieCompteRendu) {
  return client.post<CompteRendu>("/comptes-rendus", saisie);
}

export function modifierCompteRendu(id: string, saisie: SaisieCompteRendu) {
  return client.put<CompteRendu>(`/comptes-rendus/${id}`, saisie);
}

/** Sans corps : le destinataire est déduit du type par le serveur (Gestionnaire pour un terrain, DGA pour un consolidé). */
export function transmettreCompteRendu(id: string) {
  return client.post<CompteRendu>(`/comptes-rendus/${id}/transmettre`, undefined);
}

export function controlerCompteRendu(id: string, observation?: string) {
  return client.post<CompteRendu>(`/comptes-rendus/${id}/controler`, { observation });
}

export function consoliderComptesRendus(compteRenduIds: readonly string[], synthese?: string) {
  return client.post<CompteRendu>("/comptes-rendus/consolider", { compteRenduIds, synthese });
}
