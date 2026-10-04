/**
 * COSITI — Workflow de correction, validation et traçabilité (Maker–Checker) des trois premiers modules.
 *
 * Contrat réel (`COSITI_Backend/src/main/java/cm/cositi/api/workflow/`, `V19__workflow_validation_3_modules.sql`) ;
 * le document `COSITI_V1_BACKEND_UI_UX_MISE_A_JOUR_3_MODULES_WORKFLOW.md` cite des routes cibles en anglais
 * (`/validation-requests`, `/submit`, `/approve`…) que le backend sert en français (`/demandes-validation`,
 * `/soumettre`, `/approuver`…, §27 bis du document backend).
 *
 * Le backend décide de tout : qui peut demander, qui peut décider (jamais l'auteur de la demande), dans quel
 * état, sur quelle version. Ce module transporte ; il ne calcule ni n'autorise rien.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";
import { estErreurApi } from "@/api/erreurs";

/** Statut de validation d'un dossier adhérent ou d'un profil d'agent (`StatutValidationEntite`). */
export type StatutValidationEntite = "BROUILLON" | "EN_ATTENTE_VALIDATION" | "CORRECTION_DEMANDEE" | "VALIDE" | "REJETE";

/** Cycle d'une demande (`StatutDemandeValidation`). */
export type StatutDemandeValidation =
  | "BROUILLON"
  | "EN_ATTENTE_VALIDATION"
  | "CORRECTION_DEMANDEE"
  | "APPROUVEE"
  | "REJETEE"
  | "ANNULEE";

export const STATUTS_DEMANDE_OUVERTS: readonly StatutDemandeValidation[] = ["BROUILLON", "EN_ATTENTE_VALIDATION", "CORRECTION_DEMANDEE"];

export type TypeEntiteWorkflow = "ADHERENT" | "AGENT" | "PAIEMENT";

export type TypeOperationWorkflow =
  | "ADHERENT_VALIDATION_DOSSIER"
  | "ADHERENT_MODIFICATION"
  | "AGENT_VALIDATION_PROFIL"
  | "AGENT_MODIFICATION"
  | "AGENT_CHANGEMENT_STATUT"
  | "PAIEMENT_CORRECTION";

export type ActionWorkflow = "CREATION" | "SOUMISSION" | "RESOUMISSION" | "APPROBATION" | "REJET" | "DEMANDE_CORRECTION" | "ANNULATION";

export type TypeDonneeChamp = "TEXTE" | "DATE" | "DECIMAL" | "UUID" | "BOOLEEN" | "ENUM";

/**
 * Permission de décision par opération (`TypeOperationWorkflow.permissionValidation`, backend). Sert
 * **uniquement** à afficher ou masquer les boutons de décision ; la politique serveur (permission, rôle DAF
 * pour la validation financière, auteur ≠ validateur, périmètre) reste seule juge.
 */
export const PERMISSION_DECISION: Readonly<Record<TypeOperationWorkflow, string>> = {
  ADHERENT_VALIDATION_DOSSIER: "ADHERENT:VALIDER",
  ADHERENT_MODIFICATION: "ADHERENT:VALIDER",
  AGENT_VALIDATION_PROFIL: "AGENT:VALIDER",
  AGENT_MODIFICATION: "AGENT:VALIDER",
  AGENT_CHANGEMENT_STATUT: "AGENT:VALIDER",
  PAIEMENT_CORRECTION: "PAIEMENT:VALIDER",
};

/** `ElementDemandeValidationDto` : un champ, sa valeur officielle au moment de la demande, la valeur proposée. */
export interface ElementDemande {
  readonly id: string;
  readonly champ: string;
  readonly typeDonnee: TypeDonneeChamp;
  readonly ancienneValeur: string | null;
  readonly valeurProposee: string | null;
  readonly motifChangement: string | null;
}

export interface DocumentDemande {
  readonly id: string;
  readonly documentId: string;
  readonly typeDocument: string | null;
  readonly obligatoire: boolean;
  readonly ajoutePar: string | null;
  readonly ajouteLe: string;
}

/** `DemandeValidationDto`. `avertissements` : informations de la dernière opération (jamais persistées ici). */
export interface DemandeValidation {
  readonly id: string;
  readonly reference: string;
  readonly typeEntite: TypeEntiteWorkflow;
  readonly entiteId: string;
  readonly typeOperation: TypeOperationWorkflow;
  readonly statut: StatutDemandeValidation;
  readonly demandePar: string | null;
  readonly demandeParIdentifiant: string | null;
  readonly demandeLe: string;
  readonly soumiseLe: string | null;
  readonly examineePar: string | null;
  readonly examineeLe: string | null;
  readonly appliqueeLe: string | null;
  readonly motif: string | null;
  readonly commentaireValidateur: string | null;
  readonly versionBase: number;
  readonly version: number | null;
  readonly elements: readonly ElementDemande[];
  readonly documents: readonly DocumentDemande[];
  readonly avertissements: readonly string[];
}

/** `DecisionDemandeValidationDto` : une transition de la demande. */
export interface DecisionDemande {
  readonly id: string;
  readonly action: ActionWorkflow;
  readonly statutAvant: StatutDemandeValidation | null;
  readonly statutApres: StatutDemandeValidation | null;
  readonly decidePar: string | null;
  readonly decideParIdentifiant: string | null;
  readonly decideLe: string;
  readonly commentaire: string | null;
}

/**
 * `StatutValidationEntiteDto`. `statutValidation` : statut de validation (adhérent, agent) ou statut du paiement.
 * `modifiableDirectement` : les routes de modification directe sont encore acceptées par le serveur.
 */
export interface StatutValidationEntiteDto {
  readonly typeEntite: TypeEntiteWorkflow;
  readonly entiteId: string;
  readonly statutValidation: string;
  readonly version: number | null;
  readonly modifiableDirectement: boolean;
  readonly demandeOuverte: DemandeValidation | null;
  readonly derniereDemande: DemandeValidation | null;
}

/** `PropositionChampDto` : valeurs en texte (dates `AAAA-MM-JJ`, décimaux avec point) ; vide = effacer. */
export interface PropositionChamp {
  champ: string;
  valeurProposee: string | null;
  motifChangement?: string;
}

export interface FiltresDemandes {
  statut?: StatutDemandeValidation;
  typeEntite?: TypeEntiteWorkflow;
  typeOperation?: TypeOperationWorkflow;
  entiteId?: string;
  mesDemandes?: boolean;
  page?: number;
  taille?: number;
}

function parametres(valeurs: Record<string, unknown>): string {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(valeurs)) {
    if (valeur === undefined || valeur === null || valeur === "" || valeur === false) continue;
    requete.set(cle, String(valeur));
  }
  const texte = requete.toString();
  return texte ? `?${texte}` : "";
}

/** En-tête d'idempotence : une clé par intention (ouverture du dialogue), réutilisée si l'utilisateur réessaie. */
function avecCle(cleIdempotence?: string) {
  return cleIdempotence ? { enTetes: { "Idempotency-Key": cleIdempotence } } : {};
}

/* ==========================================================================
   Socle transversal — /demandes-validation
   ======================================================================== */

/** Demandes visibles par le demandeur (périmètre et permission de lecture appliqués par le serveur). */
export function listerDemandes(filtres: FiltresDemandes) {
  return client.get<EnveloppeListe<DemandeValidation>>(`/demandes-validation${parametres({ ...filtres })}`);
}

/** File de validation : demandes soumises que l'utilisateur peut décider — jamais les siennes. */
export function listerDemandesEnAttente(typeEntite?: TypeEntiteWorkflow, page = 0, taille = 25) {
  return client.get<EnveloppeListe<DemandeValidation>>(`/demandes-validation/en-attente${parametres({ typeEntite, page, taille })}`);
}

export function obtenirDemande(id: string) {
  return client.get<DemandeValidation>(`/demandes-validation/${id}`);
}

export function obtenirDecisionsDemande(id: string) {
  return client.get<DecisionDemande[]>(`/demandes-validation/${id}/decisions`);
}

export interface CorpsDecision {
  commentaire?: string;
  /** Approbation d'un dossier adhérent malgré des doublons signalés au recontrôle — décision tracée. */
  ignorerDoublons?: boolean;
}

export function soumettreDemande(id: string, cle?: string) {
  return client.post<DemandeValidation>(`/demandes-validation/${id}/soumettre`, {}, avecCle(cle));
}

export function approuverDemande(id: string, corps: CorpsDecision, cle?: string) {
  return client.post<DemandeValidation>(`/demandes-validation/${id}/approuver`, corps, avecCle(cle));
}

/** Motif obligatoire (`DEMANDE_MOTIF_REQUIS`). */
export function rejeterDemande(id: string, commentaire: string, cle?: string) {
  return client.post<DemandeValidation>(`/demandes-validation/${id}/rejeter`, { commentaire }, avecCle(cle));
}

/** Motif obligatoire (`DEMANDE_MOTIF_REQUIS`). */
export function demanderCorrectionDemande(id: string, commentaire: string, cle?: string) {
  return client.post<DemandeValidation>(`/demandes-validation/${id}/demander-correction`, { commentaire }, avecCle(cle));
}

/** `elements` (facultatif) remplace les propositions d'une demande de modification. */
export function resoumettreDemande(id: string, corps: { commentaire?: string; elements?: PropositionChamp[] }, cle?: string) {
  return client.post<DemandeValidation>(`/demandes-validation/${id}/resoumettre`, corps, avecCle(cle));
}

/** Auteur uniquement, demande ouverte. */
export function annulerDemande(id: string, commentaire?: string, cle?: string) {
  return client.post<DemandeValidation>(`/demandes-validation/${id}/annuler`, commentaire ? { commentaire } : {}, avecCle(cle));
}

/** Rattache un document déjà téléversé (`POST /documents`). */
export function joindreJustificatif(id: string, documentId: string) {
  return client.post<DocumentDemande>(`/demandes-validation/${id}/justificatifs`, { documentId });
}

/* ==========================================================================
   Routes par module
   ======================================================================== */

const RACINE: Readonly<Record<TypeEntiteWorkflow, string>> = {
  ADHERENT: "/adherents",
  AGENT: "/agents",
  PAIEMENT: "/paiements",
};

export function obtenirStatutValidation(type: TypeEntiteWorkflow, entiteId: string) {
  return client.get<StatutValidationEntiteDto>(`${RACINE[type]}/${entiteId}/statut-validation`);
}

export function obtenirHistoriqueValidation(type: TypeEntiteWorkflow, entiteId: string) {
  return client.get<DemandeValidation[]>(`${RACINE[type]}/${entiteId}/historique-validation`);
}

export interface CorpsSoumissionEntite {
  motif?: string;
  documentIds?: string[];
  versionBase?: number | null;
}

/**
 * Soumission d'un dossier adhérent ou d'un profil d'agent (création contrôlée). Une cotisation se soumet par
 * `POST /paiements/{id}/soumettre` (module cotisations).
 */
export function soumettreEntite(type: "ADHERENT" | "AGENT", entiteId: string, corps: CorpsSoumissionEntite, cle?: string) {
  return client.post<DemandeValidation>(`${RACINE[type]}/${entiteId}/soumettre`, { ...corps, cleIdempotence: cle }, avecCle(cle));
}

export interface CorpsDemandeModification {
  motif: string;
  elements: PropositionChamp[];
  documentIds?: string[];
  versionBase?: number | null;
  brouillon?: boolean;
}

/**
 * Demande de modification d'une donnée officielle : `/adherents/{id}/demandes-modification`,
 * `/agents/{id}/demandes-modification`, `/paiements/{id}/demandes-correction`. Soumise immédiatement.
 */
export function creerDemandeModification(type: TypeEntiteWorkflow, entiteId: string, corps: CorpsDemandeModification, cle?: string) {
  const chemin = type === "PAIEMENT" ? "demandes-correction" : "demandes-modification";
  return client.post<DemandeValidation>(`${RACINE[type]}/${entiteId}/${chemin}`, { ...corps, cleIdempotence: cle }, avecCle(cle));
}

export interface CorpsChangementStatutAgent {
  actif: boolean;
  motif: string;
  documentIds?: string[];
  versionBase?: number | null;
}

/** Activation / désactivation d'un agent validé : le statut officiel ne change qu'à l'approbation. */
export function demanderChangementStatutAgent(agentId: string, corps: CorpsChangementStatutAgent, cle?: string) {
  return client.post<DemandeValidation>(`/agents/${agentId}/demandes-changement-statut`, { ...corps, cleIdempotence: cle }, avecCle(cle));
}

/* ==========================================================================
   Erreurs du workflow
   ======================================================================== */

/** Codes signalant que la donnée a changé depuis sa lecture : l'utilisateur doit recharger avant d'agir. */
const CODES_CONFLIT_VERSION = new Set([
  "DEMANDE_VERSION_OBSOLETE",
  "BILAN_CAISSE_VERSION_OBSOLETE",
  "CONFLIT_VERSION",
  // Parcours d'adhésion (V20).
  "CONTROLE_DGA_VERSION_OBSOLETE",
  "FRAIS_ADHESION_VERSION_OBSOLETE",
  "ADHERENT_VERSION_OBSOLETE",
  // Règles et matrice documentaire (V21).
  "EXIGENCE_VERSION_OBSOLETE",
]);

export function estConflitVersion(erreur: unknown): boolean {
  return estErreurApi(erreur) && CODES_CONFLIT_VERSION.has(erreur.code);
}

/**
 * Codes renvoyés par une route de modification directe sur une donnée officielle : l'écran propose alors
 * la demande de modification au lieu d'afficher une simple erreur.
 */
const CODES_MODIFICATION_PAR_DEMANDE = new Set([
  "ADHERENT_MODIFICATION_PAR_DEMANDE",
  "AGENT_MODIFICATION_PAR_DEMANDE",
  "AGENT_CHANGEMENT_STATUT_PAR_DEMANDE",
  "PAIEMENT_CORRECTION_PAR_DEMANDE",
]);

export function exigeDemandeModification(erreur: unknown): boolean {
  return estErreurApi(erreur) && CODES_MODIFICATION_PAR_DEMANDE.has(erreur.code);
}
