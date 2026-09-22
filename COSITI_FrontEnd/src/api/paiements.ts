/**
 * COSITI — Domaine « Cotisations » (J4). Contrat vérifié directement dans le
 * code backend réel (`COSITI_Backend/src/main/java/cm/cositi/api/cotisation/`),
 * `03_SPECIFICATIONS_API.md §4` ne détaillant pas tous les champs.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";

export type StatutPaiement = "BROUILLON" | "A_CONTROLER" | "VALIDE" | "RAPPROCHE" | "ANNULE" | "INCOHERENCE";
export type ModePaiement = "ESPECES" | "ORANGE_MONEY" | "MTN_MOMO" | "VIREMENT";

const MODES_MOBILE_MONEY: ReadonlySet<string> = new Set(["ORANGE_MONEY", "MTN_MOMO"]);

export function estModeMobileMoney(mode: string): boolean {
  return MODES_MOBILE_MONEY.has(mode);
}

export interface Paiement {
  readonly id: string;
  readonly adherentId: string;
  readonly numeroRecu: string;
  readonly datePaiement: string;
  readonly montant: number;
  readonly modePaiement: ModePaiement;
  readonly referenceTransaction: string | null;
  readonly typePaiement: string;
  readonly agentEncaisseurId: string | null;
  readonly statut: StatutPaiement;
  readonly validePar: string | null;
  readonly version: number;
  /**
   * TODO [A] : absent de `PaiementDto` côté backend au moment de ce jalon
   * (vérifié dans `cm.cositi.api.cotisation.dto.PaiementDto`) alors que le
   * service compare bien `paiement.getCreePar()` pour refuser
   * l'auto-validation (`PAIEMENT_AUTO_VALIDATION_INTERDITE`). Champ optionnel
   * ici : s'il est absent, le masquage préventif du bouton « Valider » ne
   * peut pas se faire ; l'API reste l'autorité finale (403 explicite quand
   * même affiché). Signalé dans `Conception/SUIVI_EXECUTION.md`.
   */
  readonly creePar?: string | null;
}

export interface FiltresPaiements {
  adherentId?: string;
  statut?: StatutPaiement;
  modePaiement?: ModePaiement;
  dateDu?: string;
  dateAu?: string;
  page?: number;
  taille?: number;
}

function construireParametres(filtres: FiltresPaiements): string {
  const parametres = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    parametres.set(cle, String(valeur));
  }
  return parametres.toString();
}

export function listerPaiements(filtres: FiltresPaiements) {
  const requete = construireParametres(filtres);
  return client.get<EnveloppeListe<Paiement>>(`/paiements${requete ? `?${requete}` : ""}`);
}

export function obtenirPaiement(id: string) {
  return client.get<Paiement>(`/paiements/${id}`);
}

export interface CorpsEnregistrementPaiement {
  adherentId: string;
  datePaiement: string;
  montant: number;
  modePaiement: ModePaiement;
  referenceTransaction?: string;
  typePaiement: string;
  agentEncaisseurId?: string;
}

/** `cleIdempotence` est générée une fois au montage de l'écran, jamais de valeur de repli si `crypto.randomUUID` est indisponible. */
export function enregistrerPaiement(corps: CorpsEnregistrementPaiement, cleIdempotence: string) {
  return client.post<Paiement>("/paiements", corps, { enTetes: { "Idempotency-Key": cleIdempotence } });
}

export function validerPaiement(id: string) {
  return client.post<Paiement>(`/paiements/${id}/valider`);
}

export interface CorpsCorrectionPaiement {
  montant?: number;
  datePaiement?: string;
  referenceTransaction?: string;
  motif: string;
}

export function corrigerPaiement(id: string, corps: CorpsCorrectionPaiement) {
  return client.post<Paiement>(`/paiements/${id}/corriger`, corps);
}

export function annulerPaiement(id: string, motif: string) {
  return client.post<void>(`/paiements/${id}/annuler`, { motif });
}
