/**
 * COSITI — Domaine « Cotisations » (J4, étendu J5). Contrat vérifié
 * directement dans le code backend réel
 * (`COSITI_Backend/src/main/java/cm/cositi/api/cotisation/`),
 * `03_SPECIFICATIONS_API.md §4` ne détaillant pas tous les champs.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";

export type StatutPaiement =
  | "BROUILLON"
  | "A_CONTROLER"
  | "VALIDE"
  | "RAPPROCHE"
  | "ANNULE"
  | "INCOHERENCE"
  /** Rejet définitif et motivé par un validateur (module cotisations #17, V18) — distinct de l'annulation. */
  | "REJETE";
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
  /** Rejet (#17) — renseignés uniquement quand `statut === "REJETE"`. */
  readonly motifRejet?: string | null;
  readonly rejetePar?: string | null;
  readonly rejeteLe?: string | null;
  /** Horodatage de la saisie. */
  readonly creeLe?: string | null;
  /**
   * V22 : répartition enregistrée avec la cotisation (Sécurité sociale + Épargne = montant). `null` pour une
   * cotisation antérieure sans répartition — rien n'est déduit côté client.
   */
  readonly montantSecuriteSociale?: number | null;
  readonly montantEpargne?: number | null;
  readonly origineRepartition?: OrigineRepartition | null;
  readonly packId?: string | null;
  readonly version: number;
}

/** `SAISIE` par l'utilisateur, `PROPOSITION_SERVEUR` (règle par défaut), `REPRISE_AFFECTATIONS` (migration V22). */
export type OrigineRepartition = "SAISIE" | "PROPOSITION_SERVEUR" | "REPRISE_AFFECTATIONS";

/**
 * Champs triables de `GET /paiements` (liste blanche `CHAMPS_TRI` de `ControleurPaiement`, #1). Tout
 * autre nom renvoie `400 PAIEMENT_TRI_INVALIDE`.
 */
export type ChampTriPaiement = "DATE_PAIEMENT" | "MONTANT" | "NUMERO_RECU" | "STATUT" | "DATE_SAISIE";

/** Paramètres réels de `GET /paiements` (module cotisations, #1 à #7, #15). */
export interface FiltresPaiements {
  /** #2 */
  adherentId?: string;
  /** #3 — matricule de l'adhérent, recherche serveur. */
  adherentMatricule?: string;
  /** #4 — agent encaisseur. */
  agentId?: string;
  /** #5 — numéro de reçu ou référence de transaction. */
  reference?: string;
  /** #6, #15 (`A_CONTROLER` = file à valider). */
  statut?: StatutPaiement;
  modePaiement?: ModePaiement;
  /** #7 — bornes incluses, `AAAA-MM-JJ` ; `400 PAIEMENT_PERIODE_INVALIDE` si `dateDu > dateAu`. */
  dateDu?: string;
  dateAu?: string;
  page?: number;
  taille?: number;
  tri?: ChampTriPaiement;
  direction?: "ASC" | "DESC";
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

/** Reçu imprimable d'une cotisation (`GET /paiements/{id}/recu`, `PAIEMENT:LIRE` + périmètre). */
export interface RecuPaiement {
  readonly paiementId: string;
  readonly numeroRecu: string;
  readonly adherentId: string;
  readonly montant: number;
  readonly datePaiement: string;
  readonly modePaiement: string;
  readonly statut: StatutPaiement;
  readonly adherentMatricule: string | null;
  readonly adherentNom: string | null;
  readonly montantSecuriteSociale: number | null;
  readonly montantEpargne: number | null;
  readonly referenceTransaction: string | null;
  readonly typePaiement: string | null;
  readonly enregistrePar: string | null;
  readonly enregistreLe: string | null;
  readonly editeLe: string | null;
}

export function obtenirRecu(id: string) {
  return client.get<RecuPaiement>(`/paiements/${id}/recu`);
}

export interface CorpsEnregistrementPaiement {
  adherentId: string;
  datePaiement: string;
  montant: number;
  modePaiement: ModePaiement;
  referenceTransaction?: string;
  typePaiement: string;
  agentEncaisseurId?: string;
  /** V22 : répartition choisie à la saisie ; absente, le serveur applique la règle par défaut et la renvoie. */
  montantSecuriteSociale?: number;
  montantEpargne?: number;
  /** V22 : obligatoire à la première cotisation d'un adhérent sans adhésion ouverte (`COTISATION_PACK_REQUIS`). */
  packId?: string;
}

/**
 * #9 à #12, #35. `cleIdempotence` est générée une fois au montage de l'écran, jamais de valeur de repli
 * si `crypto.randomUUID` est indisponible ; la même clé est renvoyée après une erreur réseau, pour que le
 * serveur rende le paiement déjà créé (200) au lieu d'en créer un second. `brouillon` : saisie
 * préparatoire, à soumettre ensuite (#14).
 */
export function enregistrerPaiement(corps: CorpsEnregistrementPaiement, cleIdempotence: string, brouillon = false) {
  return client.post<Paiement>(`/paiements${brouillon ? "?brouillon=true" : ""}`, corps, {
    enTetes: { "Idempotency-Key": cleIdempotence },
  });
}

/** `VerifierDoublonPaiementDto` (#13) — mêmes champs que la saisie, sans rien créer. */
export interface CorpsVerificationDoublonPaiement {
  adherentId: string;
  datePaiement?: string;
  montant?: number;
  modePaiement: ModePaiement;
  referenceTransaction?: string;
}

/**
 * `ResultatDoublonPaiementDto` (#13). `referenceDejaUtilisee` : l'enregistrement **sera refusé**
 * (`PAIEMENT_REFERENCE_DEJA_UTILISEE`). `doublonsPotentiels` : même adhérent, date, montant et mode —
 * signalés, jamais bloquants.
 */
export interface ResultatDoublonPaiement {
  readonly referenceDejaUtilisee: boolean;
  readonly doublonsPotentiels: readonly Paiement[];
  readonly doublonDetecte: boolean;
}

export function verifierDoublonPaiement(corps: CorpsVerificationDoublonPaiement) {
  return client.post<ResultatDoublonPaiement>("/paiements/verifier-doublon", corps);
}

/** #14 — seul un brouillon, par son auteur (le serveur en juge). */
export function soumettrePaiement(id: string) {
  return client.post<Paiement>(`/paiements/${id}/soumettre`);
}

/** #16 — jamais par l'auteur de la saisie (`PAIEMENT_AUTO_VALIDATION_INTERDITE`). */
export function validerPaiement(id: string) {
  return client.post<Paiement>(`/paiements/${id}/valider`);
}

/** #17 — définitif, motif obligatoire ; paiement à contrôler ou incohérent uniquement. */
export function rejeterPaiement(id: string, motif: string) {
  return client.post<Paiement>(`/paiements/${id}/rejeter`, { motif });
}

/** `HistoriqueStatutPaiementDto` (#18), reconstruit depuis le journal d'audit. */
export interface EtapeHistoriquePaiement {
  readonly horodatage: string;
  readonly typeOperation: string;
  readonly statutAvant: string | null;
  readonly statutApres: string | null;
  readonly acteur: string | null;
  readonly motif: string | null;
}

export function obtenirHistoriqueStatuts(id: string) {
  return client.get<EtapeHistoriquePaiement[]>(`/paiements/${id}/historique-statuts`);
}

/** Agrégat `{ nombre, montant }` des statistiques et du bilan. */
export interface Agregat {
  readonly nombre: number;
  readonly montant: number;
}

/** `StatistiquesQuotidiennesDto` (#27), limitées au périmètre du demandeur. */
export interface StatistiquesQuotidiennes {
  readonly date: string;
  readonly nombreTotal: number;
  readonly montantTotal: number;
  readonly parStatut: Readonly<Record<string, Agregat>>;
  readonly parMode: Readonly<Record<string, Agregat>>;
}

/** `date` absente : aujourd'hui (serveur). */
export function obtenirStatistiquesQuotidiennes(date?: string) {
  return client.get<StatistiquesQuotidiennes>(`/paiements/statistiques/quotidiennes${date ? `?date=${date}` : ""}`);
}

export interface CorpsCorrectionPaiement {
  montant?: number;
  datePaiement?: string;
  referenceTransaction?: string;
  /** V22 : à renvoyer avec le montant quand la répartition a été saisie (`COTISATION_REPARTITION_REQUISE`). */
  montantSecuriteSociale?: number;
  montantEpargne?: number;
  motif?: string;
}

/** #19 — brouillon : par son auteur, motif facultatif ; soumis : `PAIEMENT:CORRIGER`, motif obligatoire. */
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
  // Motif en paramètre de requête (`@RequestParam`, backend) : envoyé dans le corps, il était ignoré.
  const requete = motif ? `?motif=${encodeURIComponent(motif)}` : "";
  return client.post<Paiement>(`/paiements/${id}/confirmer-chef${requete}`);
}

/**
 * Ligne de répartition d'une cotisation validée (`AffectationDto`). V21 : règle confirmée « 700 FCFA minimum vers la
 * Sécurité sociale, le reste vers l'Épargne » (`SECURITE_SOCIALE_MINIMUM_700_PUIS_EPARGNE`), calculée par le serveur.
 * `composanteLibelle` nomme la composante ; absent d'une API antérieure, la ligne s'affiche sans nom inventé.
 */
export interface AffectationPaiement {
  readonly id: string;
  readonly paiementId: string;
  readonly composanteId: string;
  readonly montant: number;
  readonly regleAppliquee: string | null;
  readonly composanteCode?: string | null;
  readonly composanteLibelle?: string | null;
}

/** `GET /paiements/{id}/affectations` (`PAIEMENT:LIRE`). */
export function listerAffectations(id: string) {
  return client.get<AffectationPaiement[]>(`/paiements/${id}/affectations`);
}

/**
 * `ContexteCotisationDto` (V22) : ce qu'il faut savoir avant de saisir une cotisation à partir d'un matricule —
 * identité de contrôle, pack courant ou à choisir, **minimums de répartition en vigueur lus en base** (le formulaire
 * n'en code aucun) et blocages éventuels.
 */
export interface ContexteCotisation {
  readonly adherentId: string;
  readonly matricule: string;
  readonly nom: string;
  readonly prenoms: string | null;
  readonly telephonePrincipal: string | null;
  readonly zoneLibelle: string | null;
  readonly statut: string;
  readonly statutValidation: string | null;
  readonly packId: string | null;
  readonly packCode: string | null;
  readonly packLibelle: string | null;
  readonly packRequis: boolean;
  readonly minimumSecuriteSociale: number;
  readonly minimumEpargne: number;
  /** `true` : une cotisation peut ne rien verser à l'Épargne ; sinon l'Épargne est due, au minimum. */
  readonly epargneFacultative: boolean;
  readonly cotisable: boolean;
  readonly motifsBlocage: readonly string[];
  readonly avertissements: readonly string[];
}

/** `GET /paiements/contexte-adherent?matricule=` (`PAIEMENT:CREER` + périmètre) — 404 si le matricule est inconnu. */
export function obtenirContexteCotisation(matricule: string) {
  return client.get<ContexteCotisation>(`/paiements/contexte-adherent?matricule=${encodeURIComponent(matricule)}`);
}
