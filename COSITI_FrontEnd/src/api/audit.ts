/**
 * COSITI — Journal d'audit (J10).
 *
 * **Lecture seule.** L'API n'expose aucune écriture ni purge, quel que soit le
 * rôle (`03_SPECIFICATIONS_API.md §10`) : ce module ne contient donc que des
 * `GET`, et il n'y a pas d'écran pour modifier une ligne d'audit.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";

export interface LigneAudit {
  readonly id: string;
  readonly horodatage: string;
  readonly utilisateurId: string | null;
  readonly utilisateurIdentifiant: string | null;
  readonly typeOperation: string;
  readonly entite: string;
  readonly entiteId: string | null;
  readonly motif: string | null;
  readonly resultat: string;
}

export interface FiltresAudit {
  entite?: string;
  entiteId?: string;
  utilisateurId?: string;
  type?: string;
  depuis?: string;
  jusqua?: string;
  page?: number;
  taille?: number;
}

export function listerAudit(filtres: FiltresAudit) {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    requete.set(cle, String(valeur));
  }
  const texte = requete.toString();
  return client.get<EnveloppeListe<LigneAudit>>(`/audit${texte ? `?${texte}` : ""}`);
}
