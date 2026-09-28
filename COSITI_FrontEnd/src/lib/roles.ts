/**
 * COSITI — Libellés des rôles.
 *
 * SOURCE UNIQUE pour l'affichage d'un rôle. `docs/02_DESIGN_SYSTEM.md §13` :
 * les rôles s'écrivent en toutes lettres (« Gestionnaire des comptes », jamais
 * « GC »). Un rôle n'est jamais distingué par une couleur (§11) : ce module ne
 * renvoie que du texte.
 *
 * Aucun affichage n'est décidé ici selon le rôle — les permissions de
 * `GET /auth/moi` s'en chargent (`auth/types.ts`).
 */
import type { CodeRole } from "@/auth/types";

const LIBELLES_ROLE: Readonly<Record<CodeRole, string>> = {
  PCA: "PCA",
  DG: "Directeur général",
  DGA: "Directeur général adjoint",
  DAF: "Directeur administratif et financier",
  GESTIONNAIRE_COMPTE: "Gestionnaire des comptes",
  CHEF_AGENT_TERRAIN: "Chef des agents de terrain",
  AGENT_TERRAIN: "Agent de terrain",
  SUPER_ADMIN: "Super Administrateur",
};

/** Libellé d'un code de rôle. Un code inconnu (API en avance) s'affiche tel quel. */
export function libelleRole(code: string | null | undefined): string {
  if (!code) return "";
  return (LIBELLES_ROLE as Readonly<Record<string, string>>)[code] ?? code;
}
