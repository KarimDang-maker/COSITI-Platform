/**
 * COSITI — Règles en attente de validation (V21, `cm.cositi.api.regle`).
 *
 * Une règle provisoire est un paramètre au statut `V` (non validé) ou `A` (proposé), ou une exigence documentaire
 * non confirmée. Le PCA (`REGLE:VALIDER`) la confirme depuis l'application, motif obligatoire (référence de la
 * décision COSITI) : la valeur ne change pas, la décision est tracée `REGLE_VALIDATION`. La lecture est ouverte à
 * `ADMINISTRATION:LIRE` ou `REGLE:VALIDER`.
 *
 * Routes : `GET /regles/en-attente`, `POST /regles/parametres/{cle}/valider`, `PUT /regles/exigences/{id}`,
 * `POST /regles/exigences/{id}/valider`.
 */
import { client } from "@/api/client";
import type { ExigenceDocumentaire, NiveauExigence } from "@/api/adhesion";

export type SourceRegle = "PARAMETRE" | "EXIGENCE_DOCUMENTAIRE";

export interface RegleEnAttente {
  readonly source: SourceRegle;
  readonly id: string;
  /** Clé du paramètre ou code de l'exigence. */
  readonly cle: string;
  readonly libelle: string;
  /** Valeur appliquée en attendant la décision (niveau pour une exigence). */
  readonly valeur: string | null;
  readonly statutValidation: string;
  readonly modifieLe: string | null;
  readonly modifiePar: string | null;
}

export interface SyntheseRegles {
  readonly parametresNonValides: number;
  readonly parametresProposes: number;
  readonly exigencesNonConfirmees: number;
  readonly regles: readonly RegleEnAttente[];
}

export function obtenirReglesEnAttente() {
  return client.get<SyntheseRegles>("/regles/en-attente");
}

export function validerParametre(cle: string, motif: string) {
  return client.post<unknown>(`/regles/parametres/${encodeURIComponent(cle)}/valider`, { motif });
}

export interface CorpsModificationExigence {
  niveau: NiveauExigence;
  conditionApplication?: string;
  verificationDga: boolean;
  actif: boolean;
  effectifDu?: string;
  effectifJusquau?: string;
  motif: string;
  /** Version lue : 409 si l'exigence a changé depuis. */
  version?: number | null;
}

/** Modifie une exigence sans la confirmer : la confirmation reste un acte distinct. */
export function modifierExigence(id: string, corps: CorpsModificationExigence) {
  return client.put<ExigenceDocumentaire>(`/regles/exigences/${id}`, corps);
}

/** Confirme une exigence : une pièce obligatoire confirmée devient bloquante pour l'activation. */
export function confirmerExigence(id: string, motif: string) {
  return client.post<ExigenceDocumentaire>(`/regles/exigences/${id}/valider`, { motif });
}
