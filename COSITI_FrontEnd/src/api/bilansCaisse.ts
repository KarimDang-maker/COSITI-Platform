/**
 * COSITI — Bilan journalier et rapprochement de caisse (module « Gestion des cotisations », #29 à #33).
 *
 * Routes réelles : `GET /paiements/bilan-journalier` (bilan numérique) et `/bilans-caisse/...` (saisie de la
 * caisse physique, écart, validation, anomalie) — le document cible parlait de
 * `/cotisations/daily-reconciliation`. Aucun calcul ici : l'écart, le montant numérique et sa définition
 * (modes et statuts inclus, paramètres `[V]`) viennent du serveur.
 *
 * Permissions (`V18__cotisations_rejet_bilan_caisse.sql`) : lecture PCA, DG, DGA, DAF, Gestionnaire
 * (`BILAN_CAISSE:LIRE`) ; saisie Gestionnaire (`BILAN_CAISSE:SAISIR`) ; validation et anomalie DAF
 * (`BILAN_CAISSE:VALIDER`), jamais sur son propre bilan.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";
import type { Agregat } from "@/api/paiements";

export type StatutBilanCaisse = "SAISI" | "VALIDE" | "ANOMALIE";

/** `RapprochementCaisseDto`. `ecart = montantPhysique - montantNumerique`, figé à la saisie. */
export interface RapprochementCaisse {
  readonly id: string;
  readonly date: string;
  readonly montantNumerique: number;
  readonly montantPhysique: number;
  readonly ecart: number;
  readonly nombrePaiements: number;
  readonly statut: StatutBilanCaisse;
  readonly commentaire: string | null;
  readonly saisiPar: string | null;
  readonly creePar: string | null;
  readonly creeLe: string | null;
  readonly validePar: string | null;
  readonly valideLe: string | null;
  readonly commentaireValidation: string | null;
  readonly motifAnomalie: string | null;
  readonly signalePar: string | null;
  readonly signaleLe: string | null;
  /** Recalculé à la lecture : différent de `montantNumerique` si un paiement a changé depuis la saisie. */
  readonly montantNumeriqueActuel: number | null;
  readonly numeriqueModifieDepuisSaisie: boolean;
  readonly version: number | null;
}

/** `BilanJournalierDto` (#29) : ce que la plateforme a enregistré pour la date. */
export interface BilanJournalier {
  readonly date: string;
  readonly nombrePaiements: number;
  readonly montantTotalEnregistre: number;
  readonly montantNumerique: number;
  readonly nombrePaiementsNumerique: number;
  readonly parMode: Readonly<Record<string, Agregat>>;
  readonly modesNumerique: readonly string[];
  readonly statutsInclus: readonly string[];
  /** Rapprochement déjà saisi pour la date, s'il existe. */
  readonly rapprochement: RapprochementCaisse | null;
  readonly avertissements: readonly string[];
}

/** #29 — `date` absente : aujourd'hui (serveur). */
export function obtenirBilanJournalier(date?: string) {
  return client.get<BilanJournalier>(`/paiements/bilan-journalier${date ? `?date=${date}` : ""}`);
}

export interface FiltresBilansCaisse {
  du?: string;
  au?: string;
  statut?: StatutBilanCaisse;
  page?: number;
  taille?: number;
}

export function listerBilansCaisse(filtres: FiltresBilansCaisse) {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    requete.set(cle, String(valeur));
  }
  const texte = requete.toString();
  return client.get<EnveloppeListe<RapprochementCaisse>>(`/bilans-caisse${texte ? `?${texte}` : ""}`);
}

/** #31 — `404` tant qu'aucun montant physique n'a été saisi pour la date. */
export function obtenirRapprochement(date: string) {
  return client.get<RapprochementCaisse>(`/bilans-caisse/${date}`);
}

export interface CorpsSaisieCaisse {
  date: string;
  montantPhysique: number;
  commentaire?: string;
}

/** #30 — un seul bilan par date ; ressaisie possible uniquement après une anomalie. */
export function saisirCaissePhysique(corps: CorpsSaisieCaisse) {
  return client.post<RapprochementCaisse>("/bilans-caisse", corps);
}

/**
 * #32 — commentaire et version en paramètres de requête (contrat serveur). `version` active la concurrence
 * optimiste : `409 BILAN_CAISSE_VERSION_OBSOLETE` si le bilan a changé depuis sa lecture.
 */
export function validerBilanCaisse(date: string, commentaire?: string, version?: number | null) {
  const requete = new URLSearchParams();
  if (commentaire) requete.set("commentaire", commentaire);
  if (version !== undefined && version !== null) requete.set("version", String(version));
  const texte = requete.toString();
  return client.post<RapprochementCaisse>(`/bilans-caisse/${date}/valider${texte ? `?${texte}` : ""}`);
}

/** #33 — motif obligatoire ; l'auteur de la saisie est notifié par le serveur. */
export function signalerAnomalieBilan(date: string, motif: string) {
  return client.post<RapprochementCaisse>(`/bilans-caisse/${date}/anomalie`, { motif });
}
