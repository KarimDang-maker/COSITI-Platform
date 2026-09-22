/**
 * COSITI — Domaine « Organisation terrain » (`03_SPECIFICATIONS_API.md §6`).
 *
 * Contrat vérifié directement dans le code backend réel
 * (`COSITI_Backend/src/main/java/cm/cositi/api/organisation/`), le pack
 * `03_SPECIFICATIONS_API.md §6` ne détaillant ni les permissions ni les
 * formes de réponse exactes pour ce domaine. Écart signalé dans
 * `Conception/SUIVI_EXECUTION.md` plutôt que corrigé unilatéralement dans le
 * pack. Notamment : `GET /zones` et `GET /agents` renvoient une **liste
 * simple**, pas l'enveloppe paginée utilisée par `/adherents` et
 * `/paiements`.
 */
import { client } from "@/api/client";
import type { StatutAdherent } from "@/api/adherents";

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

export function listerAgents() {
  return client.get<Agent[]>("/agents");
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

export function obtenirPortefeuilleAgent(agentId: string) {
  return client.get<AdherentResume[]>(`/agents/${agentId}/portefeuille`);
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

/** Réservé `ORGANISATION:AFFECTER_PORTEFEUILLE`. Motif **obligatoire** pour un transfert. */
export function transfererPortefeuille(adherentIds: readonly string[], nouvelAgentId: string, motif: string) {
  return client.post<void>("/portefeuilles/transferer", { adherentIds, nouvelAgentId, motif });
}
