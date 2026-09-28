/**
 * COSITI — Exports CSV (J10).
 *
 * Tout export est filtré par le périmètre du demandeur et **journalisé** côté
 * serveur (`EXPORT_SENSIBLE`). Le client ne construit aucun fichier : il demande,
 * reçoit, et propose l'enregistrement.
 *
 * Le format XLSX et la génération asynchrone décrits par
 * `03_SPECIFICATIONS_API.md §10` ne sont pas construits en V1 — voir
 * `Conception/SUIVI_EXECUTION.md`. Au-delà du seuil de lignes, l'API refuse
 * l'export (`400 EXPORT_TROP_VOLUMINEUX`) plutôt que de bloquer la requête.
 */
import { client, type FichierRecu } from "@/api/client";

export type TypeExport = "adherents" | "paiements" | "cnps" | "audit";

export interface FiltresExport {
  zoneId?: string;
  statut?: string;
  du?: string;
  au?: string;
  /** `audit` uniquement — réservé au Super Administrateur (correctif COSITI V1 §3). */
  entite?: string;
  type?: string;
  depuis?: string;
  jusqua?: string;
}

export function lancerExport(type: TypeExport, filtres: FiltresExport = {}): Promise<FichierRecu> {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    requete.set(cle, String(valeur));
  }
  const texte = requete.toString();
  return client.telechargerFichier(`/exports/${type}${texte ? `?${texte}` : ""}`, { methode: "POST" });
}
