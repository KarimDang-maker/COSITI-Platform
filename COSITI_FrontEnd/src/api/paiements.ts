/**
 * COSITI — Domaine « Cotisations » (J4, étendu J5). Contrat vérifié
 * directement dans le code backend réel
 * (`COSITI_Backend/src/main/java/cm/cositi/api/cotisation/`),
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
  /**
   * Écart J4 résolu au jalon J5 : `PaiementDto` (backend) expose désormais
   * réellement `creePar` (vérifié dans le code backend livré en parallèle
   * de ce lot) — champ resté optionnel ici par défense en profondeur
   * (l'API reste de toute façon l'autorité finale sur l'auto-validation).
   */
  readonly creePar?: string | null;
  /** Confirmation hiérarchique du Chef (UC-CHEF-10, J5) — ne change pas `statut`. */
  readonly confirmeParChefId: string | null;
  readonly confirmeLe: string | null;
  /** Motif du signalement DAF quand `statut === "INCOHERENCE"` (J5). */
  readonly motifIncoherence: string | null;
  readonly version: number;
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

/**
 * COSITI — Contrôle DAF (J5). Écart de mandat résolu en cours de lot : ce
 * chemin et cette permission (`PAIEMENT:SIGNALER_INCOHERENCE`) ont d'abord
 * été inférés (ni documentés en `03_SPECIFICATIONS_API.md §4`, ni présents
 * dans `V5__catalogue_permissions.sql`), puis confirmés à l'identique une
 * fois le code backend réel livré en parallèle de ce lot
 * (`ControleurPaiement.signalerIncoherence`, `V8__permissions_j5_j6.sql`).
 * Réservé au rôle `DAF` côté service (`ServicePaiementImpl`), motif
 * obligatoire. Seul un paiement `A_CONTROLER` peut être signalé incohérent ;
 * la résolution se fait par `corrigerPaiement`, qui rouvre le paiement au
 * contrôle (`PAIEMENT_TRANSITION_INTERDITE` sinon) — règle appliquée
 * uniquement côté serveur, jamais recalculée ici.
 */
export function signalerIncoherencePaiement(id: string, motif: string) {
  return client.post<Paiement>(`/paiements/${id}/signaler-incoherence`, { motif });
}

/**
 * COSITI — Confirmation hiérarchique du Chef des agents de terrain
 * (UC-CHEF-10, J5). `POST /paiements/{id}/confirmer-chef`, motif facultatif
 * (`ConfirmerChefDto`, backend réel). Réservée à un utilisateur portant le
 * rôle `CHEF_AGENT_TERRAIN` et dans le périmètre de l'agent encaisseur du
 * paiement (`ServicePaiementImpl.verifierPerimetreChefSurEncaisseur`) — ne
 * change jamais `statut`, seuls `confirmeParChefId`/`confirmeLe` sont
 * renseignés. Action distincte de « Valider » (`PAIEMENT:VALIDER`, DAF,
 * UC-DAF-04) : les deux se nomment « confirmer » dans le vocabulaire métier
 * mais sont deux permissions, deux rôles et deux endpoints différents — le
 * frontend ne les fusionne pas.
 */
export function confirmerParChefPaiement(id: string, motif?: string) {
  return client.post<Paiement>(`/paiements/${id}/confirmer-chef`, motif ? { motif } : undefined);
}
