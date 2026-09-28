/**
 * COSITI — Domaine « Rapports DAF » (J10).
 *
 * Flux DAF → PCA (`Roles des acteurs.md §12.3`). Contrat marqué `[A]` dans le
 * pack : vérifié dans le code backend réel (`cm.cositi.api.daf`) et **à faire
 * valider formellement par la COSITI**.
 *
 * Deux points de contrat repris tels quels :
 *  - les chiffres d'un rapport sont **constatés par le serveur puis figés** ; le
 *    client n'en fournit aucun et n'en recalcule aucun ;
 *  - un rapport n'est lisible par le PCA, le DG et la DGA qu'une fois
 *    **transmis**. Avant cela, l'API répond `403 RAPPORT_NON_TRANSMIS`.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";

/** `StatutRapportDaf` (backend). Domaine `rapportDaf` de `src/lib/statuts.ts`. */
export type StatutRapportDaf = "BROUILLON" | "PRODUIT" | "TRANSMIS";

export interface RapportDaf {
  readonly id: string;
  readonly titre: string;
  readonly statut: StatutRapportDaf;
  readonly periodeDebut: string;
  readonly periodeFin: string;
  readonly montantValide: number;
  readonly montantAControler: number;
  readonly nbPaiementsValides: number;
  readonly nbIncoherences: number;
  /** Indicateurs figés à la production, tels quels. */
  readonly contenuJson: string;
  readonly commentaire: string | null;
  readonly produitLe: string | null;
  readonly produitPar: string | null;
  readonly transmisLe: string | null;
  readonly transmisPar: string | null;
}

export interface ProductionRapport {
  titre: string;
  periodeDebut: string;
  periodeFin: string;
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

export function listerRapportsDaf(filtres: { statut?: StatutRapportDaf; page?: number; taille?: number }) {
  return client.get<EnveloppeListe<RapportDaf>>(`/daf/rapports${parametres(filtres)}`);
}

export function obtenirRapportDaf(id: string) {
  return client.get<RapportDaf>(`/daf/rapports/${id}`);
}

export function produireRapportDaf(production: ProductionRapport) {
  return client.post<RapportDaf>("/daf/rapports", production);
}

/** Sans corps : le destinataire est le PCA par définition du flux. */
export function transmettreRapportDaf(id: string) {
  return client.post<RapportDaf>(`/daf/rapports/${id}/transmettre`, undefined);
}
