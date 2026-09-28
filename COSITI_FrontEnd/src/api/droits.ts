/**
 * COSITI — Domaine « Droits et régularité » (J6).
 *
 * Contrat vérifié directement dans le code backend réel
 * (`COSITI_Backend/src/main/java/cm/cositi/api/droits/`), livré par la
 * session backend en parallèle de ce lot — même méthode qu'en J3/J4. Aucune
 * règle de calcul ici : jours couverts, statut de régularité, éligibilité
 * CNPS viennent tous de l'API (`AGENTS.md` règle 2).
 *
 * Écart corrigé en cours de lot : ce fichier a d'abord été écrit contre le
 * seul exemple de `03_SPECIFICATIONS_API.md §5` (qui inclut un champ
 * `pack`), avant que le code backend réel (`SituationDroitsDto`,
 * `AdherentEnRetardDto`) ne soit disponible. Aligné ensuite sur les DTO
 * réels, sensiblement plus sobres que l'exemple du pack — voir
 * `Conception/SUIVI_EXECUTION.md` pour le détail de l'écart entre le pack
 * technique et l'implémentation réelle.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";

/** `StatutRegularite` (backend) — mêmes valeurs que le domaine `regularite` de `src/lib/statuts.ts`. */
export type StatutRegularite = "A_JOUR" | "PARTIELLEMENT_A_JOUR" | "EN_RETARD" | "JAMAIS_COTISE";

/**
 * Forme exacte de `SituationDroitsDto` (backend). Ne contient **pas** de
 * champ `pack`, contrairement à l'exemple illustratif de
 * `03_SPECIFICATIONS_API.md §5` — écart constaté à la lecture du DTO réel.
 */
export interface SituationDroits {
  readonly adherentId: string;
  readonly matricule: string;
  readonly couvertJusquAu: string | null;
  readonly joursCouvertsTotal: number;
  readonly joursRetard: number;
  readonly cumulCotise: number;
  readonly soldeAvantSeuil: number;
  readonly statut: StatutRegularite;
  readonly eligibleCnps: boolean;
  readonly avertissements: readonly string[];
}

export function obtenirSituationDroits(adherentId: string, au?: string) {
  return client.get<SituationDroits>(`/droits/adherents/${adherentId}${au ? `?au=${au}` : ""}`);
}

/** `StatutPeriode` (backend, `cm.cositi.api.droits.entite.StatutPeriode`). */
export type StatutPeriode = "COUVERTE" | "PARTIELLE" | "ANNULEE";

/** Forme exacte de `PeriodeDroitsDto` (backend). */
export interface PeriodeDroits {
  readonly id: string;
  readonly adherentId: string;
  readonly dateDebut: string;
  readonly dateFin: string;
  readonly joursCouverts: number;
  readonly montantImpute: number;
  readonly packId: string | null;
  readonly statut: StatutPeriode;
  readonly sourceAffectationId: string | null;
}

export function obtenirPeriodesDroits(adherentId: string) {
  return client.get<PeriodeDroits[]>(`/droits/adherents/${adherentId}/periodes`);
}

/**
 * Motif obligatoire (`RecalculerDroitsDto`, `@NotBlank` côté backend),
 * réservé `DAF`/`ADMIN_SYSTEME` (`DROITS:RECALCULER`). Endpoint disponible
 * mais aucune action d'écran ne le déclenche à ce jour — non construit,
 * hors mandat de ce jalon.
 */
export function recalculerDroits(adherentId: string, motif: string) {
  return client.post<void>(`/droits/adherents/${adherentId}/recalculer`, { motif });
}

/**
 * Filtres réels de `GET /droits/retardataires`
 * (`cm.cositi.api.droits.dto.CritereRetard`) : `zoneId`, `agentId`,
 * `joursRetardMin`, `packId` — tous les quatre confirmés par le contrôleur
 * backend réel. `packId` attend l'UUID du pack, pas son code (`PACK_700`) ;
 * aucun endpoint de référentiel des packs n'existe pour le résoudre depuis
 * un code lisible, ce filtre n'est donc pas exposé à l'écran (même
 * situation que `packId` sur `GET /adherents`, non construit en J2).
 */
export interface FiltresRetardataires {
  zoneId?: string;
  agentId?: string;
  joursRetardMin?: number;
  packId?: string;
  page?: number;
  taille?: number;
}

function construireParametres(filtres: FiltresRetardataires): string {
  const parametres = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    parametres.set(cle, String(valeur));
  }
  return parametres.toString();
}

/**
 * Forme exacte de `AdherentEnRetardDto` (backend) : bien plus sobre que ce
 * que ce fichier supposait avant la lecture du code réel — ni pack, ni
 * cumul cotisé, ni agent, ni zone, ni statut de régularité ne sont renvoyés.
 * L'écran `/droits` n'affiche donc que ces cinq champs ; les colonnes
 * demandées par le mandat de session mais absentes de la réponse réelle
 * (pack, cumul, agent, zone, statut) sont documentées comme non
 * construites plutôt qu'inventées (`AGENTS.md` règle 2) —
 * voir `Conception/SUIVI_EXECUTION.md`.
 *
 * Le tri par retard décroissant est **toujours appliqué côté serveur**
 * (`ServiceRegulariteImpl.retardataires`, non paramétrable) : l'écran ne
 * propose donc pas de bascule de tri sur cette colonne.
 */
export interface Retardataire {
  readonly adherentId: string;
  readonly matricule: string;
  readonly nomComplet: string;
  readonly couvertJusquAu: string | null;
  readonly joursRetard: number;
}

export function listerRetardataires(filtres: FiltresRetardataires) {
  const requete = construireParametres(filtres);
  return client.get<EnveloppeListe<Retardataire>>(`/droits/retardataires${requete ? `?${requete}` : ""}`);
}
