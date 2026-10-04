/**
 * COSITI — Domaine « Organisation terrain » (`03_SPECIFICATIONS_API.md §6`).
 *
 * Contrat vérifié directement dans le code backend réel
 * (`COSITI_Backend/src/main/java/cm/cositi/api/organisation/`), le pack
 * `03_SPECIFICATIONS_API.md §6` ne détaillant ni les permissions ni les
 * formes de réponse exactes pour ce domaine. Écart signalé dans
 * `Conception/SUIVI_EXECUTION.md` plutôt que corrigé unilatéralement dans le
 * pack. `GET /zones` renvoie une **liste simple** ; depuis le module « Gestion
 * des agents de terrain » (25 fonctionnalités), `GET /agents` et
 * `GET /agents/{id}/portefeuille` renvoient l'**enveloppe paginée** commune.
 */
import { client } from "@/api/client";
import type { StatutAdherent } from "@/api/adherents";
import type { AdherentEligibleCnps } from "@/api/cnps";
import type { EnveloppeListe } from "@/api/pagination";
import type { StatutValidationEntite } from "@/api/workflow";

export interface Zone {
  readonly id: string;
  readonly code: string;
  readonly libelle: string;
  readonly ville: string | null;
  readonly region: string | null;
  readonly zoneParenteId: string | null;
  readonly active: boolean;
}

export interface Agent {
  readonly id: string;
  readonly codeAgent: string;
  readonly nomComplet: string;
  readonly telephone: string;
  readonly zoneId: string | null;
  readonly utilisateurId: string | null;
  /** L'agent qui est le Chef DE cet agent (supervision descendante) — pas un indicateur « cet agent est Chef ». */
  readonly chefAgentId: string | null;
  readonly objectifCollecteMensuel: number | null;
  readonly actif: boolean;
  /** Présent uniquement dans la réponse de création — jamais consultable ensuite. */
  readonly motDePasseInitial?: string | null;
  /** Workflow V19 : `VALIDE` = profil officiel, modifications et changement de statut par demande uniquement. */
  readonly statutValidation?: StatutValidationEntite;
  /** Verrouillage optimiste (V19). */
  readonly version?: number | null;
}

export interface ChargeAgent {
  readonly agentId: string;
  readonly periode: string;
  readonly nombreAdherents: number;
  readonly montantCollecte: number;
  readonly objectifCollecteMensuel: number | null;
}

export interface AdherentResume {
  readonly id: string;
  readonly matricule: string;
  readonly nomComplet: string;
  readonly telephonePrincipal: string;
  readonly zoneId: string | null;
  /** Présents dans `AdherentResumeDto` depuis J12 (portefeuille paginé) ; absents de `/portefeuilles/sans-agent`. */
  readonly zoneLibelle?: string | null;
  readonly dateAdhesion?: string;
  readonly statut: StatutAdherent;
}

export interface HistoriqueDesignationChef {
  readonly id: string;
  readonly zoneId: string;
  readonly agentId: string;
  readonly agentRemplaceId: string | null;
  readonly designePar: string;
  readonly motif: string;
  readonly horodatage: string;
}

export function listerZones() {
  return client.get<Zone[]>("/zones");
}

/**
 * Champs triables de `GET /agents` (liste blanche `CHAMPS_TRI` de `ControleurAgent`). Tout autre nom
 * renvoie `400 AGENT_TRI_INVALIDE`.
 */
export type ChampTriAgent = "NOM" | "CODE_AGENT" | "ZONE";

/** Paramètres réels de `GET /agents` (module agents de terrain, #1, #2, #21). */
export interface FiltresAgents {
  /** #2 — nom, code agent, téléphone : recherche serveur. */
  recherche?: string;
  /** #21 */
  actif?: boolean;
  zoneId?: string;
  page?: number;
  taille?: number;
  tri?: ChampTriAgent;
  direction?: "ASC" | "DESC";
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

/**
 * #1, #2, #21 — liste **paginée** depuis le module agents de terrain (enveloppe commune). Avant ce module,
 * `GET /agents` renvoyait une liste simple : les écrans qui ne veulent qu'un référentiel de sélection
 * passent par {@link listerAgents}.
 */
export function listerAgentsPagines(filtres: FiltresAgents) {
  return client.get<EnveloppeListe<Agent>>(`/agents${parametres({ ...filtres })}`);
}

/**
 * Référentiel des agents pour les sélecteurs (filtre de liste, affectation, saisie d'un paiement) : une
 * page de la taille maximale acceptée par le serveur (200). Au volume V1, elle couvre tous les agents.
 */
export async function listerAgents(): Promise<Agent[]> {
  const page = await listerAgentsPagines({ taille: 200 });
  return [...page.contenu];
}

/** #3 */
export function obtenirAgent(agentId: string) {
  return client.get<Agent>(`/agents/${agentId}`);
}

/** `ModificationAgentDto` (#5) — réservé DGA (`ORGANISATION:GERER` + rôle DGA vérifié par le service). */
export interface CorpsModificationAgent {
  nomComplet: string;
  telephone: string;
  zoneId: string | null;
  objectifCollecteMensuel: number | null;
}

/** #5 */
export function modifierAgent(agentId: string, corps: CorpsModificationAgent) {
  return client.put<Agent>(`/agents/${agentId}`, corps);
}

/** #6 — motif obligatoire dans les deux sens ; `409 AGENT_STATUT_INCHANGE` si l'état est déjà celui demandé. */
export function changerStatutAgent(agentId: string, actif: boolean, motif: string) {
  return client.post<Agent>(`/agents/${agentId}/statut`, { actif, motif });
}

/** `ResumePortefeuilleDto` (#8, #10, #11) — complétion évaluée par la même formule que la fiche adhérent. */
export interface ResumePortefeuille {
  readonly totalAdherents: number;
  readonly dossiersComplets: number;
  readonly dossiersIncomplets: number;
}

export function obtenirResumePortefeuille(agentId: string) {
  return client.get<ResumePortefeuille>(`/agents/${agentId}/portefeuille/resume`);
}

/** `AffectationPortefeuilleDto` (#24) — ouverte (`dateFin` nul) ou clôturée, jamais supprimée. */
export interface AffectationPortefeuille {
  readonly adherentId: string;
  readonly dateDebut: string;
  readonly dateFin: string | null;
  readonly motif: string | null;
}

export function obtenirHistoriquePortefeuille(agentId: string) {
  return client.get<AffectationPortefeuille[]>(`/agents/${agentId}/portefeuille/historique`);
}

/** #13 — éligibles CNPS non immatriculés du portefeuille (`CNPS:LIRE`). */
export function listerEligiblesCnpsPortefeuille(agentId: string) {
  return client.get<AdherentEligibleCnps[]>(`/agents/${agentId}/portefeuille/cnps/eligibles`);
}

/** #12 — proches du seuil CNPS dans le portefeuille (`CNPS:LIRE`, ratio `[V]`). */
export function listerProchesSeuilPortefeuille(agentId: string) {
  return client.get<AdherentEligibleCnps[]>(`/agents/${agentId}/portefeuille/cnps/proches-seuil`);
}

/** `ResumeCotisationsAgentDto` (#14, #15) — agrégé par le serveur sur le mois `periode` (`AAAA-MM`). */
export interface ResumeCotisationsAgent {
  readonly agentId: string;
  readonly periode: string;
  readonly nombrePaiements: number;
  readonly montantValide: number;
  readonly montantEnAttente: number;
  readonly montantAnnule: number;
}

export function obtenirResumeCotisationsAgent(agentId: string, periode: string) {
  return client.get<ResumeCotisationsAgent>(`/agents/${agentId}/cotisations-resume?periode=${periode}`);
}

/** `AuditLigneDto` restreint à l'agent (#7, #22, #23), du plus récent au plus ancien. */
export interface OperationAgent {
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

/** `depuis`/`jusqua` : instants ISO-8601 (`2026-09-01T00:00:00Z`). */
export function listerOperationsAgent(agentId: string, depuis?: string, jusqua?: string) {
  return client.get<OperationAgent[]>(`/agents/${agentId}/operations${parametres({ depuis, jusqua })}`);
}

/** `DistributionPortefeuilleDto` (#19) — agents **actifs** seulement, triés par nom par le serveur. */
export interface DistributionPortefeuille {
  readonly agentId: string;
  readonly codeAgent: string;
  readonly nomComplet: string;
  readonly nombreAdherents: number;
}

export function obtenirDistributionPortefeuilles() {
  return client.get<DistributionPortefeuille[]>("/agents/portefeuille-distribution");
}

export interface CorpsCreationAgent {
  identifiantConnexion: string;
  nomComplet: string;
  telephone: string;
  zoneId: string;
  objectifCollecteMensuel?: number;
}

/** Réservé DGA (`ORGANISATION:GERER`), audité `AGENT_CREATION_PAR_DGA` côté backend. */
export function creerAgent(corps: CorpsCreationAgent) {
  return client.post<Agent>("/agents", corps);
}

/** #9 — paginé depuis le module agents de terrain. */
export function obtenirPortefeuilleAgent(agentId: string, page = 0, taille = 25) {
  return client.get<EnveloppeListe<AdherentResume>>(`/agents/${agentId}/portefeuille${parametres({ page, taille })}`);
}

/** `periode` au format `AAAA-MM`. */
export function obtenirChargeAgent(agentId: string, periode: string) {
  return client.get<ChargeAgent>(`/agents/${agentId}/charge?periode=${periode}`);
}

/** Réservé DGA (`ORGANISATION:DESIGNER_CHEF`). `agentId` est le candidat, pas un Chef à remplacer. */
export function designerChef(agentId: string, motif: string) {
  return client.post<Agent>(`/agents/${agentId}/designer-chef`, { motif });
}

/** Réservé DGA (`ORGANISATION:DESIGNER_CHEF`). `agentId` est le **nouveau** Chef ; l'ancien est retrouvé côté serveur. */
export function remplacerChef(agentId: string, motif: string) {
  return client.post<Agent>(`/agents/${agentId}/remplacer-chef`, { motif });
}

/** Lève une `ErreurApiException` (404 `ORGANISATION_AUCUN_CHEF`) si aucun Chef n'est désigné pour cette zone. */
export function obtenirChefCourant(zoneId: string) {
  return client.get<Agent>(`/agents/chef?zoneId=${zoneId}`);
}

export function obtenirHistoriqueChef(agentId: string) {
  return client.get<HistoriqueDesignationChef[]>(`/agents/${agentId}/historique-chef`);
}

export function listerSansAgentReferent(zoneId: string) {
  return client.get<AdherentResume[]>(`/portefeuilles/sans-agent?zoneId=${zoneId}`);
}

/** Réservé `ORGANISATION:AFFECTER_PORTEFEUILLE`. Motif facultatif pour une première affectation. */
export function affecterPortefeuille(adherentId: string, agentId: string, motif?: string) {
  return client.post<void>("/portefeuilles/affecter", { adherentId, agentId, motif });
}

/** Réservé `ORGANISATION:AFFECTER_PORTEFEUILLE`. Motif **obligatoire** pour un transfert (#18). */
export function transfererPortefeuille(adherentIds: readonly string[], nouvelAgentId: string, motif: string) {
  return client.post<void>("/portefeuilles/transferer", { adherentIds, nouvelAgentId, motif });
}

/**
 * #17 — clôture logique de l'affectation ouverte, sans réaffectation. Motif obligatoire ;
 * `404 PORTEFEUILLE_AUCUNE_AFFECTATION` si l'adhérent n'est plus affecté.
 */
export function retirerPortefeuille(adherentId: string, motif: string) {
  return client.post<void>("/portefeuilles/retirer", { adherentId, motif });
}
