/**
 * Remises de caisse (module Cotisations) : espèces collectées par un agent de terrain, déclarées par le Gestionnaire
 * puis réceptionnées par le DAF.
 *
 * Routes :
 *  - `GET /remises-caisse/a-remettre?agentId=` (`PAIEMENT:CREER`) : cotisations de l'agent restant à remettre ;
 *  - `POST /remises-caisse` (`PAIEMENT:CREER`) : déclaration ;
 *  - `GET /remises-caisse` (`FINANCES:CONSULTER`, DAF) et `GET /remises-caisse/{id}` ;
 *  - `POST /remises-caisse/{id}/receptionner` (`PAIEMENT:VALIDER`, DAF).
 *
 * Le serveur contrôle tout (agent encaisseur, cotisation déjà remise, annulée ou rejetée, réception unique) ; l'écran
 * n'en recopie aucune règle.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";
import type { Paiement } from "@/api/paiements";

export type StatutRemiseCaisse = "DECLAREE" | "CLOTUREE" | "EN_ECART" | "RECUE";

export interface RemiseCaisse {
  readonly id: string;
  readonly agentId: string;
  readonly montantDeclare: number;
  readonly montantRecu: number | null;
  readonly ecart: number | null;
  readonly statut: StatutRemiseCaisse;
  readonly dateRemise: string | null;
  readonly recuLe: string | null;
  readonly creeLe: string | null;
  readonly nombrePaiements: number | null;
}

export interface FiltresRemises {
  statut?: StatutRemiseCaisse;
  agentId?: string;
  page?: number;
  taille?: number;
}

export function listerRemisesCaisse(filtres: FiltresRemises) {
  const parametres = new URLSearchParams();
  if (filtres.statut) parametres.set("statut", filtres.statut);
  if (filtres.agentId) parametres.set("agentId", filtres.agentId);
  parametres.set("page", String(filtres.page ?? 0));
  parametres.set("taille", String(filtres.taille ?? 25));
  return client.get<EnveloppeListe<RemiseCaisse>>(`/remises-caisse?${parametres.toString()}`);
}

export function listerCotisationsARemettre(agentId: string) {
  return client.get<Paiement[]>(`/remises-caisse/a-remettre?agentId=${encodeURIComponent(agentId)}`);
}

export function declarerRemiseCaisse(corps: { agentId: string; paiementIds: string[] }) {
  return client.post<RemiseCaisse>("/remises-caisse", corps);
}

export function receptionnerRemiseCaisse(id: string, montantRecu: number) {
  return client.post<RemiseCaisse>(`/remises-caisse/${id}/receptionner`, { montantRecu });
}
