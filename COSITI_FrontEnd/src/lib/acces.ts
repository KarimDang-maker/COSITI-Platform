/**
 * COSITI — Accès aux rubriques de l'interface (décision COSITI du 05/10/2026, lot V23).
 *
 * Un seul endroit pour les règles d'affichage par rubrique, exprimées en permissions renvoyées par `GET /auth/moi` :
 * la navigation, les gardes de route et les raccourcis des écrans les lisent ici. Masquer reste un confort : l'API
 * décide (`AGENTS.md` règle 1) — voir `COSITI_Backend/docs/SPEC_BACKEND_V23_REGLES_ACCES.md`.
 *
 * - **Finances** (cotisations, frais d'adhésion, bilan de caisse, file DAF) : exclusives au DAF (`PAIEMENT:VALIDER`).
 *   Le Gestionnaire saisit les cotisations depuis la fiche adhérent (`/cotisations/nouveau`), sans la rubrique.
 * - **Centre de validation** : DG et DGA (`AGENT:VALIDER`, centre identique) et DAF (`PAIEMENT:VALIDER`, toutes les
 *   validations financières). Ni le Gestionnaire des comptes, ni le PCA, ni le terrain.
 * - **Terrain** (agents, organisation, comptes rendus) : masqué pour le DAF.
 */
import type { CodePermission } from "@/auth/types";

/** Rubrique Finances et écrans financiers : le DAF seul. */
export const PERMISSION_FINANCES: CodePermission = "PAIEMENT:VALIDER";

/** Centre de validation : DG / DGA (`AGENT:VALIDER`) et DAF (`PAIEMENT:VALIDER`). */
export const PERMISSIONS_CENTRE_VALIDATION: readonly CodePermission[] = ["AGENT:VALIDER", "PAIEMENT:VALIDER"];

/** Les détenteurs de cette permission (le DAF) ne voient pas la rubrique Terrain. */
export const PERMISSION_SANS_TERRAIN: CodePermission = "PAIEMENT:VALIDER";
