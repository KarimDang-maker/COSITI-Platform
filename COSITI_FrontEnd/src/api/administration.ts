/**
 * COSITI — Domaine « Administration » (J11).
 *
 * Contrat vérifié dans le code backend réel (`cm.cositi.api.administration`).
 *
 * Deux absences volontaires, qui sont des décisions et non des oublis :
 *  - **aucune suppression de compte** — un compte se désactive (`AGENTS.md`
 *    règle absolue n°3) ;
 *  - **aucune création de rôle** — les huit rôles de la V1 sont fermés
 *    (`Roles des acteurs.md §16`), en ajouter un reviendrait à inventer un
 *    acteur hors périmètre.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";
import type { CodeRole } from "@/auth/types";

export interface UtilisateurAdmin {
  readonly id: string;
  readonly identifiant: string;
  readonly nomComplet: string;
  readonly email: string | null;
  readonly telephone: string | null;
  readonly actif: boolean;
  readonly doitChangerMotDePasse: boolean;
  readonly verrouille: boolean;
  readonly verrouilleJusquA: string | null;
  readonly derniereConnexionLe: string | null;
  readonly roles: readonly CodeRole[];
  readonly agentId: string | null;
}

export interface RoleAdmin {
  readonly code: CodeRole;
  readonly libelle: string;
  readonly description: string | null;
  readonly permissions: readonly string[];
}

export interface ParametreAdmin {
  readonly id: string;
  readonly cle: string;
  readonly valeur: string;
  readonly typeValeur: string;
  readonly libelle: string;
  readonly modifiableParRole: string;
  /** `C` confirmé · `A` à analyser · `V` non validé par la COSITI. */
  readonly statutValidation: string;
  readonly modifieLe: string | null;
  readonly modifiePar: string | null;
}

export interface CreationUtilisateur {
  identifiant: string;
  nomComplet: string;
  email?: string;
  telephone?: string;
  roles: readonly CodeRole[];
}

/** Le mot de passe initial n'est renvoyé qu'ici, une seule fois : il n'est relisible nulle part ensuite. */
export interface CompteCree {
  readonly utilisateur: UtilisateurAdmin;
  readonly motDePasseInitial: string;
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

export function listerUtilisateurs(filtres: { recherche?: string; actif?: boolean; page?: number; taille?: number }) {
  return client.get<EnveloppeListe<UtilisateurAdmin>>(
    `/administration/utilisateurs${parametres(filtres)}`,
  );
}

export function creerUtilisateur(creation: CreationUtilisateur) {
  return client.post<CompteCree>("/administration/utilisateurs", creation);
}

export function changerActivation(id: string, actif: boolean, motif: string) {
  return client.post<UtilisateurAdmin>(`/administration/utilisateurs/${id}/activation`, { actif, motif });
}

export function changerRoles(id: string, roles: readonly CodeRole[], motif: string) {
  return client.post<UtilisateurAdmin>(`/administration/utilisateurs/${id}/roles`, { roles, motif });
}

export function reinitialiserMotDePasse(id: string) {
  return client.post<{ motDePasseInitial: string }>(
    `/administration/utilisateurs/${id}/mot-de-passe/reinitialiser`,
    undefined,
  );
}

export function listerRolesAdmin() {
  return client.get<RoleAdmin[]>("/administration/roles");
}

export function listerParametres() {
  return client.get<ParametreAdmin[]>("/administration/parametres");
}

export function modifierParametre(cle: string, valeur: string, motif: string) {
  return client.put<ParametreAdmin>(`/administration/parametres/${cle}`, { valeur, motif });
}
