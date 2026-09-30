/**
 * COSITI — Domaine « Tableaux de bord » (J9).
 *
 * **Six dashboards exclusivement** : PCA, DG, DGA, DAF, Gestionnaire des comptes,
 * Super Administrateur (`Roles des acteurs.md §2` et `§11`). Le Chef des agents
 * de terrain et l'Agent de terrain n'en ont pas — ne jamais en ajouter un.
 *
 * Aucun indicateur n'est calculé ici. Le serveur renvoie des valeurs et l'unité
 * qui dit comment les mettre en forme ; un taux est un **ratio** (0,331), jamais
 * un nombre déjà multiplié.
 */
import { client } from "@/api/client";
import type { IndicateurCle } from "@/components/cositi/carte-indicateur";
import type { AlerteTableauBord } from "@/components/cositi/liste-alertes";
import type { LigneZone } from "@/components/cositi/graphique-zones";

export type { IndicateurCle, AlerteTableauBord, LigneZone };

export interface LigneAgent {
  readonly agentId: string;
  readonly codeAgent: string;
  readonly nomComplet: string;
  readonly zoneLibelle: string | null;
  readonly nbAdherentsPortefeuille: number;
  readonly nbPaiementsSaisis: number;
  readonly montantCollecte: number;
}

interface SocleTableauBord {
  readonly indicateurs: readonly IndicateurCle[];
  readonly alertes: readonly AlerteTableauBord[];
  readonly avertissements: readonly string[];
}

export interface TableauBordPca extends SocleTableauBord {
  readonly zones: readonly LigneZone[];
  readonly rapportsDafDisponibles: number;
}

export interface TableauBordDg extends SocleTableauBord {
  readonly zones: readonly LigneZone[];
  readonly adherentsEnRetard: number;
}

export interface TableauBordDga extends SocleTableauBord {
  readonly zones: readonly LigneZone[];
  readonly agents: readonly LigneAgent[];
  readonly comptesRendusConsolidesRecus: number;
  /** Vide en V1 : les objectifs terrain sont marqués `[A]`, rien n'est calculé. */
  readonly objectifsTermes: readonly string[];
}

export interface TableauBordDaf extends SocleTableauBord {
  readonly paiementsAControler: number;
  readonly paiementsIncoherence: number;
  readonly remisesEnEcart: number;
  readonly montantAControler: number;
  readonly montantValide: number;
}

export interface TableauBordGestionnaire extends SocleTableauBord {
  readonly dossiersCnpsIncomplets: number;
  readonly eligiblesNonImmatricules: number;
  readonly declarationsAProduire: number;
  readonly comptesRendusAControler: number;
  readonly adherentsEnRetard: number;
}

export interface TableauBordSuperAdmin extends SocleTableauBord {
  readonly utilisateursActifs: number;
  readonly utilisateursVerrouilles: number;
  readonly connexionsEchoueesDernieres24h: number;
  readonly parametresNonValides: number;
  readonly evenementsAuditDernieres24h: number;
}

export interface FiltresTableauBord {
  du?: string;
  au?: string;
  zoneId?: string;
}

function parametres(filtres: FiltresTableauBord): string {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    requete.set(cle, String(valeur));
  }
  const texte = requete.toString();
  return texte ? `?${texte}` : "";
}

export function obtenirTableauBordPca(filtres: FiltresTableauBord = {}) {
  return client.get<TableauBordPca>(`/tableaux-de-bord/pca${parametres(filtres)}`);
}

export function obtenirTableauBordDg(filtres: FiltresTableauBord = {}) {
  return client.get<TableauBordDg>(`/tableaux-de-bord/dg${parametres(filtres)}`);
}

export function obtenirTableauBordDga(filtres: FiltresTableauBord = {}) {
  return client.get<TableauBordDga>(`/tableaux-de-bord/dga${parametres(filtres)}`);
}

export function obtenirTableauBordDaf(filtres: FiltresTableauBord = {}) {
  return client.get<TableauBordDaf>(`/tableaux-de-bord/daf${parametres(filtres)}`);
}

export function obtenirTableauBordGestionnaire(filtres: FiltresTableauBord = {}) {
  return client.get<TableauBordGestionnaire>(`/tableaux-de-bord/gestionnaire${parametres(filtres)}`);
}

export function obtenirTableauBordSuperAdmin(filtres: FiltresTableauBord = {}) {
  return client.get<TableauBordSuperAdmin>(`/tableaux-de-bord/super-admin${parametres(filtres)}`);
}

/**
 * Route du tableau de bord d'un utilisateur, déduite de ses **permissions** et non
 * de son rôle : c'est l'API qui décide, le client ne fait que suivre. `null` pour
 * l'Agent de terrain et le Chef, qui n'ont pas de dashboard en V1 — ils sont alors
 * dirigés vers leur écran de travail.
 */
export function cheminTableauBord(permissions: readonly string[]): string | null {
  const correspondances: readonly [string, string][] = [
    ["TABLEAU_BORD:PCA", "/tableaux-de-bord/pca"],
    ["TABLEAU_BORD:DG", "/tableaux-de-bord/dg"],
    ["TABLEAU_BORD:DGA", "/tableaux-de-bord/dga"],
    ["TABLEAU_BORD:DAF", "/tableaux-de-bord/daf"],
    ["TABLEAU_BORD:GESTIONNAIRE", "/tableaux-de-bord/gestionnaire"],
    ["TABLEAU_BORD:SUPER_ADMIN", "/tableaux-de-bord/super-admin"],
  ];
  return correspondances.find(([permission]) => permissions.includes(permission))?.[1] ?? null;
}
