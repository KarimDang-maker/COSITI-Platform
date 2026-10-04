/**
 * COSITI — Frais d'adhésion, activation par le Gestionnaire et contrôle documentaire DGA
 * (`COSITI_V1_SPECIFICATION_COMPLETE_FRAIS_ADHESION_ACTIVATION_CONTROLE_DGA.md`, V20).
 *
 * Routes réelles (le document cible parlait de `/adhesion-fees`, `/dga/document-verifications`,
 * `/adherents/{id}/activate`…) :
 *  - `/adherents/{id}/frais-adhesion`, `/activation`, `/activer`, `/statut-activation`, `/soumettre-dga`,
 *    `/synthese-workflow`, `/controle-dga`, `/controles-dga` ;
 *  - `/frais-adhesion` (liste, configuration, synthèses, rapprochement, valider, anomalie, résolution) ;
 *  - `/controles-dga` (file, synthèse, détail, journal, démarrer, vérifier une information ou un document, terminer).
 *
 * **Aucun calcul ici.** Le montant unitaire (paramètre `MONTANT_INSCRIPTION`), le montant attendu, l'écart, le
 * nombre de dossiers distincts soumis et le détail « N dossiers × 1 000 FCFA = … » viennent du serveur.
 *
 * Permissions (V20) : `ADHERENT:ACTIVER` et `FRAIS_ADHESION:ENREGISTRER` (Gestionnaire) ; `CONTROLE_DGA:EFFECTUER`
 * (DGA) ; `FRAIS_ADHESION:VALIDER` (DAF, jamais sur son propre enregistrement) ; `FRAIS_ADHESION:SIGNALER` (DGA,
 * DAF) ; lectures `FRAIS_ADHESION:LIRE` et `CONTROLE_DGA:LIRE` (PCA, DG, DGA, DAF, Gestionnaire selon le cas).
 */
import { client } from "@/api/client";
import type { LigneAudit } from "@/api/audit";
import type { EnveloppeListe } from "@/api/pagination";

export type StatutFraisAdhesion = "ENREGISTRE" | "VALIDE" | "ANOMALIE";
export type StatutControle = "EN_ATTENTE" | "EN_COURS" | "CORRECTION_DEMANDEE" | "VALIDE" | "REJETE";
export type StatutControleDga =
  | "NON_SOUMIS"
  | "EN_ATTENTE_DGA"
  | "EN_VERIFICATION"
  | "CORRECTION_DEMANDEE"
  | "VALIDE"
  | "REJETE";
export type StatutCorrespondance =
  | "CORRESPOND"
  | "NON_CORRESPOND"
  | "NON_VERIFIABLE"
  | "NON_LISIBLE"
  | "DOCUMENT_MANQUANT"
  /** V21 : information sans objet pour cet adhérent — ni anomalie, ni motif exigé. */
  | "NON_APPLICABLE";
export type DecisionControleDga = "VALIDER" | "DEMANDER_CORRECTION" | "REJETER";
/** Caractère d'une pièce dans la matrice documentaire (V21, §19). */
export type NiveauExigence = "OBLIGATOIRE" | "CONDITIONNELLE" | "OPTIONNELLE" | "NON_APPLICABLE";
/** Statut calculé d'une pièce dans la checklist d'un adhérent (V21, §20) — jamais recalculé ici. */
export type StatutPiece =
  | "REQUIS"
  | "NON_FOURNI"
  | "FOURNI"
  | "EN_VERIFICATION"
  | "VALIDE"
  | "NON_CONFORME"
  | "ILLISIBLE"
  | "EXPIRE"
  | "REMPLACE"
  | "NON_APPLICABLE";
export type TypeEcartFrais = "SANS_FRAIS" | "MONTANT_DIFFERENT" | "ANOMALIE_SIGNALEE";

/** Libellés des anomalies documentaires : seules ces trois bloquent la validation (`StatutCorrespondance.estAnomalie`). */
export const CORRESPONDANCES_ANOMALIE: readonly StatutCorrespondance[] = [
  "NON_CORRESPOND",
  "NON_LISIBLE",
  "DOCUMENT_MANQUANT",
];

export interface ConfigurationFraisAdhesion {
  readonly typeFrais: string;
  readonly montantUnitaire: number;
  readonly devise: string;
  readonly parametre: string;
  readonly regleValidee: boolean;
}

export interface FraisAdhesion {
  readonly id: string;
  readonly reference: string;
  readonly adherentId: string;
  readonly adherentMatricule: string | null;
  readonly adherentNom: string | null;
  readonly agentId: string;
  readonly agentNom: string | null;
  readonly typeFrais: string;
  readonly montantAttendu: number;
  readonly montantRecu: number;
  readonly ecart: number;
  readonly devise: string;
  readonly dateCollecte: string;
  readonly statut: StatutFraisAdhesion;
  readonly enregistrePar: string | null;
  readonly enregistreLe: string | null;
  readonly validePar: string | null;
  readonly valideLe: string | null;
  readonly motifAnomalie: string | null;
  readonly anomalieSignaleeLe: string | null;
  readonly resolutionAnomalie: string | null;
  readonly anomalieResolueLe: string | null;
  readonly commentaire: string | null;
  readonly version: number | null;
}

export interface FraisAdhesionAdherent {
  readonly adherentId: string;
  readonly montantRequis: number;
  readonly devise: string;
  readonly enregistre: boolean;
  readonly frais: FraisAdhesion | null;
}

export interface StatutActivation {
  readonly adherentId: string;
  readonly matricule: string | null;
  readonly statut: string;
  readonly statutValidation: string | null;
  readonly statutControleDga: StatutControleDga;
  readonly activeLe: string | null;
  readonly activePar: string | null;
  readonly premiereSoumissionDgaLe: string | null;
  readonly derniereSoumissionDgaLe: string | null;
  readonly controleCourantId: string | null;
  readonly controleCourantReference: string | null;
  readonly dejaActive: boolean;
  readonly version: number | null;
}

export interface ConditionActivation {
  /** IDENTITE, STATUT, DOUBLON, DOCUMENTS, FRAIS_ADHESION */
  readonly code: string;
  readonly libelle: string;
  readonly satisfaite: boolean;
  readonly bloquant: boolean;
  readonly detail: string | null;
}

export interface VerificationActivation {
  readonly adherentId: string;
  readonly matricule: string | null;
  readonly statut: string;
  readonly statutControleDga: StatutControleDga;
  readonly dejaActive: boolean;
  readonly activable: boolean;
  readonly conditions: readonly ConditionActivation[];
  readonly avertissements: readonly string[];
}

export interface CompteursControle {
  readonly documents: number;
  readonly documentsConformes: number;
  readonly documentsEnAnomalie: number;
  readonly champs: number;
  readonly champsVerifies: number;
  readonly champsConformes: number;
  readonly anomalies: number;
  readonly nonVerifiables: number;
}

export interface ChampControle {
  readonly id: string;
  readonly champ: string;
  readonly libelle: string;
  readonly valeurNumerique: string | null;
  readonly valeurPhysique: string | null;
  readonly statutCorrespondance: StatutCorrespondance | null;
  readonly commentaire: string | null;
  readonly verifiePar: string | null;
  readonly verifieLe: string | null;
  readonly version: number | null;
}

export interface DocumentControle {
  readonly id: string;
  readonly documentId: string | null;
  readonly typeDocument: string;
  readonly obligatoire: boolean;
  readonly statut: string;
  readonly champs: readonly ChampControle[];
}

export interface ControleDga {
  readonly id: string;
  readonly reference: string;
  readonly adherentId: string;
  readonly adherentMatricule: string | null;
  readonly adherentNom: string | null;
  readonly tour: number;
  readonly controlePrecedentId: string | null;
  readonly statut: StatutControle;
  readonly soumisPar: string | null;
  readonly soumisLe: string | null;
  readonly demarrePar: string | null;
  readonly demarreLe: string | null;
  readonly terminePar: string | null;
  readonly termineLe: string | null;
  readonly commentaireDecision: string | null;
  readonly compteurs: CompteursControle;
  readonly documents: readonly DocumentControle[];
  /** V21 : la décision « Valider » n'est possible que sans blocage — calculé par le serveur, jamais ici. */
  readonly validable?: boolean;
  readonly blocages?: readonly string[];
  readonly version: number | null;
}

export interface SyntheseWorkflowAdherent {
  readonly activation: StatutActivation;
  readonly fraisAdhesion: FraisAdhesionAdherent | null;
  readonly controleCourant: ControleDga | null;
  readonly demandeModificationOuverte: boolean;
}

export interface LigneFileControleDga {
  readonly controleId: string;
  readonly reference: string;
  readonly tour: number;
  readonly statut: StatutControle;
  readonly adherentId: string;
  readonly matricule: string | null;
  readonly nom: string | null;
  readonly agentCollecteurId: string | null;
  readonly agentCollecteur: string | null;
  readonly gestionnaire: string | null;
  readonly activeLe: string | null;
  readonly soumisLe: string | null;
  readonly nombreDocuments: number;
  readonly nombreDocumentsVerifies: number;
  readonly nombreAnomalies: number;
}

export interface SyntheseControleDga {
  readonly du: string | null;
  readonly au: string | null;
  readonly dossiersDistinctsSoumis: number;
  readonly resoumissions: number;
  readonly parStatutControle: Readonly<Record<string, number>>;
  readonly champsEnAnomalie: number;
}

export interface SyntheseFraisAdhesion {
  readonly du: string | null;
  readonly au: string | null;
  readonly agentId: string | null;
  readonly nombreFrais: number;
  readonly montantAttendu: number;
  readonly montantRecu: number;
  readonly ecart: number;
  readonly nombreParStatut: Readonly<Record<string, number>>;
  readonly parJour: readonly {
    readonly date: string;
    readonly nombreFrais: number;
    readonly montantAttendu: number;
    readonly montantRecu: number;
  }[];
}

export interface LigneEcartFrais {
  readonly adherentId: string;
  readonly matricule: string | null;
  readonly nom: string | null;
  readonly agentId: string | null;
  readonly agentNom: string | null;
  readonly referenceFrais: string | null;
  readonly montantAttendu: number;
  readonly montantEnregistre: number;
  readonly ecart: number;
  readonly typeEcart: TypeEcartFrais;
}

export interface RapprochementFraisAdhesion {
  readonly du: string | null;
  readonly au: string | null;
  readonly agentId: string | null;
  readonly nombreDossiersSoumis: number;
  readonly montantUnitaire: number;
  readonly montantAttendu: number;
  readonly montantEnregistre: number;
  /** `enregistré − attendu`, signalé, jamais corrigé automatiquement. */
  readonly ecart: number;
  /** « 60 dossiers × 1 000 FCFA = 60 000 FCFA » — affiché tel quel, jamais recomposé. */
  readonly detailCalcul: string;
  readonly nombreDossiersSansFrais: number;
  readonly nombreEcarts: number;
  readonly ecarts: readonly LigneEcartFrais[];
  readonly fraisHorsSoumission: number;
  readonly montantHorsSoumission: number;
  readonly avertissements: readonly string[];
}

export interface Periode {
  du?: string;
  au?: string;
}

function chaineRequete(parametres: Record<string, string | number | boolean | readonly string[] | undefined>): string {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(parametres)) {
    if (valeur === undefined || valeur === "" || valeur === false) continue;
    if (Array.isArray(valeur)) for (const v of valeur) requete.append(cle, String(v));
    else requete.set(cle, String(valeur));
  }
  const texte = requete.toString();
  return texte ? `?${texte}` : "";
}

/* ----- Parcours d'un adhérent ----- */

export function obtenirSyntheseWorkflowAdherent(adherentId: string) {
  return client.get<SyntheseWorkflowAdherent>(`/adherents/${adherentId}/synthese-workflow`);
}

export function obtenirFraisAdhesionAdherent(adherentId: string) {
  return client.get<FraisAdhesionAdherent>(`/adherents/${adherentId}/frais-adhesion`);
}

export interface CorpsEnregistrementFrais {
  agentId: string;
  /** Facultatif : par défaut, le montant attendu (serveur). Un écart est enregistré tel quel et signalé. */
  montantRecu?: number;
  dateCollecte?: string;
  commentaire?: string;
  cleIdempotence: string;
}

/** 201 à la création, 200 si la même clé d'idempotence a déjà été jouée. */
export function enregistrerFraisAdhesion(adherentId: string, corps: CorpsEnregistrementFrais) {
  return client.post<FraisAdhesion>(`/adherents/${adherentId}/frais-adhesion`, corps);
}

export function verifierActivation(adherentId: string) {
  return client.get<VerificationActivation>(`/adherents/${adherentId}/activation`);
}

export interface CorpsActivation {
  versionBase?: number | null;
  /** Confirmation explicite malgré des doublons potentiels — tracée dans l'audit par le serveur. */
  ignorerDoublons?: boolean;
}

/** Compte ACTIF puis transmission automatique au contrôle DGA (EN_ATTENTE_DGA). Idempotent. */
export function activerAdherent(adherentId: string, corps: CorpsActivation) {
  return client.post<StatutActivation>(`/adherents/${adherentId}/activer`, corps);
}

export function obtenirStatutActivation(adherentId: string) {
  return client.get<StatutActivation>(`/adherents/${adherentId}/statut-activation`);
}

/** Transmission, ou retransmission après une demande de correction de la DGA. */
export function soumettreAuControleDga(adherentId: string, commentaire?: string) {
  return client.post<ControleDga>(`/adherents/${adherentId}/soumettre-dga`, commentaire ? { commentaire } : {});
}

export function obtenirControleCourant(adherentId: string) {
  return client.get<ControleDga>(`/adherents/${adherentId}/controle-dga`);
}

export function listerControlesAdherent(adherentId: string) {
  return client.get<ControleDga[]>(`/adherents/${adherentId}/controles-dga`);
}

/* ----- Contrôle documentaire DGA ----- */

export interface FiltresFileControle extends Periode {
  statut?: readonly StatutControle[];
  agentId?: string;
  avecAnomalie?: boolean;
  page?: number;
  taille?: number;
}

export function listerFileControleDga(filtres: FiltresFileControle) {
  return client.get<EnveloppeListe<LigneFileControleDga>>(`/controles-dga${chaineRequete({ ...filtres })}`);
}

export function obtenirSyntheseControleDga(periode: Periode) {
  return client.get<SyntheseControleDga>(`/controles-dga/synthese${chaineRequete({ ...periode })}`);
}

export function obtenirControleDga(id: string) {
  return client.get<ControleDga>(`/controles-dga/${id}`);
}

export function obtenirJournalControleDga(id: string) {
  return client.get<LigneAudit[]>(`/controles-dga/${id}/journal`);
}

export function demarrerControleDga(id: string) {
  return client.post<ControleDga>(`/controles-dga/${id}/demarrer`);
}

export interface CorpsVerificationChamp {
  statutCorrespondance: StatutCorrespondance;
  /** Obligatoire pour NON_CORRESPOND (contrôlé par le serveur). */
  valeurPhysique?: string;
  /** Obligatoire pour toute réponse autre que CORRESPOND (contrôlé par le serveur). */
  commentaire?: string;
  version?: number | null;
}

export function verifierChampControle(controleId: string, champId: string, corps: CorpsVerificationChamp) {
  return client.post<ControleDga>(`/controles-dga/${controleId}/champs/${champId}/verifier`, corps);
}

export interface CorpsVerificationDocument {
  statut: Extract<StatutCorrespondance, "DOCUMENT_MANQUANT" | "NON_LISIBLE">;
  commentaire: string;
}

export function verifierDocumentControle(controleId: string, documentId: string, corps: CorpsVerificationDocument) {
  return client.post<ControleDga>(`/controles-dga/${controleId}/documents/${documentId}/verifier`, corps);
}

export interface CorpsDecisionControle {
  decision: DecisionControleDga;
  commentaire?: string;
  cleIdempotence: string;
}

export function terminerControleDga(id: string, corps: CorpsDecisionControle) {
  return client.post<ControleDga>(`/controles-dga/${id}/terminer`, corps);
}

/* ----- Frais d'adhésion : suivi, DAF, rapprochement ----- */

export function obtenirConfigurationFrais() {
  return client.get<ConfigurationFraisAdhesion>("/frais-adhesion/configuration");
}

export interface FiltresFraisAdhesion extends Periode {
  statut?: StatutFraisAdhesion;
  agentId?: string;
  seulementEcarts?: boolean;
  page?: number;
  taille?: number;
}

export function listerFraisAdhesion(filtres: FiltresFraisAdhesion) {
  return client.get<EnveloppeListe<FraisAdhesion>>(`/frais-adhesion${chaineRequete({ ...filtres })}`);
}

export function obtenirSyntheseFrais(periode: Periode) {
  return client.get<SyntheseFraisAdhesion>(`/frais-adhesion/synthese${chaineRequete({ ...periode })}`);
}

export function obtenirSyntheseFraisAgent(agentId: string, periode: Periode) {
  return client.get<SyntheseFraisAdhesion>(
    `/frais-adhesion/agents/${agentId}/synthese${chaineRequete({ ...periode })}`,
  );
}

export function obtenirRapprochementFrais(periode: Periode & { agentId?: string }) {
  return client.get<RapprochementFraisAdhesion>(`/frais-adhesion/rapprochement${chaineRequete({ ...periode })}`);
}

export function obtenirFraisAdhesion(id: string) {
  return client.get<FraisAdhesion>(`/frais-adhesion/${id}`);
}

export function validerFraisAdhesion(id: string, version?: number | null) {
  return client.post<FraisAdhesion>(
    `/frais-adhesion/${id}/valider${version !== undefined && version !== null ? `?version=${version}` : ""}`,
  );
}

export function signalerAnomalieFrais(id: string, motif: string) {
  return client.post<FraisAdhesion>(`/frais-adhesion/${id}/anomalie`, { motif });
}

export interface CorpsResolutionAnomalieFrais {
  resolution: string;
  /** Correction éventuelle du montant constaté — tracée avant/après dans l'audit par le serveur. */
  montantRecuCorrige?: number;
}

export function resoudreAnomalieFrais(id: string, corps: CorpsResolutionAnomalieFrais) {
  return client.post<FraisAdhesion>(`/frais-adhesion/${id}/resoudre-anomalie`, corps);
}

/* ----- Matrice documentaire et checklist (V21) ----- */

/** `ExigenceDocumentaireDto` : une ligne de la matrice. `bloquante` = obligatoire **et** confirmée par la COSITI. */
export interface ExigenceDocumentaire {
  readonly id: string;
  readonly code: string;
  readonly rubrique: string;
  readonly typeDocument: string | null;
  /** Information justifiée par la pièce (nom, n° CNI…) ; `null` pour la ligne de la pièce elle-même. */
  readonly champ: string | null;
  readonly libelle: string;
  readonly niveau: NiveauExigence;
  readonly conditionApplication: string | null;
  readonly verificationDga: boolean;
  /** `C` confirmée, `A` proposée, `V` non validée. */
  readonly statutValidation: string;
  readonly bloquante: boolean;
  readonly effectifDu: string | null;
  readonly effectifJusquau: string | null;
  readonly actif: boolean;
  readonly ordre: number;
  readonly version: number | null;
}

export interface ChampChecklist {
  readonly exigenceId: string;
  readonly champ: string;
  readonly libelle: string;
  readonly valeurNumerique: string | null;
  readonly dernierResultatDga: StatutCorrespondance | null;
  readonly commentaireDga: string | null;
}

export interface PieceChecklist {
  readonly exigenceId: string;
  readonly code: string;
  readonly rubrique: string;
  readonly typeDocument: string | null;
  readonly libelle: string;
  readonly niveau: NiveauExigence;
  readonly statutValidationRegle: string;
  readonly bloquante: boolean;
  readonly verificationDga: boolean;
  readonly conditionApplication: string | null;
  readonly statut: StatutPiece;
  readonly documentId: string | null;
  readonly versionDocument: number | null;
  readonly valideJusquau: string | null;
  readonly champs: readonly ChampChecklist[];
}

/** `ChecklistDocumentaireDto` : la liste des pièces, leur statut et `pretPourActivation` viennent du serveur. */
export interface ChecklistDocumentaire {
  readonly adherentId: string;
  readonly matricule: string | null;
  readonly pieces: readonly PieceChecklist[];
  readonly compteurs: {
    readonly pieces: number;
    readonly obligatoires: number;
    readonly fournies: number;
    readonly validees: number;
    readonly enAnomalie: number;
    readonly bloquantesManquantes: number;
  };
  readonly pretPourActivation: boolean;
  readonly avertissements: readonly string[];
}

export function obtenirChecklistDocumentaire(adherentId: string) {
  return client.get<ChecklistDocumentaire>(`/adherents/${adherentId}/checklist-documentaire`);
}

/** Matrice en vigueur (`enVigueur=true`) ou complète — le frontend la lit, il ne la duplique jamais. */
export function listerExigencesDocumentaires(enVigueur: boolean) {
  return client.get<ExigenceDocumentaire[]>(`/exigences-documentaires${enVigueur ? "?enVigueur=true" : ""}`);
}
