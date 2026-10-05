/**
 * COSITI — Domaine « Adhérents » (J2, étendu au module « Gestion des adhérents — 35 fonctionnalités »).
 *
 * Types et appels alignés sur le code backend réel
 * (`COSITI_Backend/src/main/java/cm/cositi/api/adherent/controleur/ControleurAdherent.java`), qui fait
 * foi sur `COSITI_GESTIONNAIRE_FRONTEND_UI_UX_97_FONCTIONNALITES.md` : ce document liste des routes
 * **cibles** (`/missing-fields`, `/contact`, `/history`…) que le backend a adaptées à ses conventions
 * (`/champs-manquants`, `/coordonnees`, `/historique`…). Chaque fonction porte le numéro de la
 * fonctionnalité qu'elle sert (#1 à #35).
 *
 * Aucun calcul ici : ce fichier transporte, il ne décide ni n'agrège rien. Complétion, éligibilité,
 * cumuls et documents manquants viennent tous du serveur (`AGENTS.md` règle 2).
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";
import type { TypeDocument } from "@/api/documents";
import type { StatutValidationEntite } from "@/api/workflow";

export type StatutAdherent = "PREINSCRIT" | "ACTIF" | "EN_RETARD" | "INACTIF" | "REACTIVE" | "RADIE";
export type Sexe = "M" | "F";

/** `AdherentDetailDto` (#12). */
export interface Adherent {
  readonly id: string;
  readonly matricule: string;
  readonly nom: string;
  readonly prenoms: string | null;
  readonly dateNaissance: string | null;
  readonly sexe: Sexe | null;
  readonly telephonePrincipal: string;
  readonly telephoneSecondaire: string | null;
  /** V22 : coordonnées complémentaires (absentes d'une API antérieure). */
  readonly whatsapp?: string | null;
  readonly email?: string | null;
  readonly numeroCni: string | null;
  readonly numeroCnps: string | null;
  readonly activiteId: string;
  readonly activiteNom?: string;
  readonly zoneId: string;
  readonly zoneLibelle: string | null;
  readonly associationId: string | null;
  readonly localisation: string;
  readonly quartier: string | null;
  readonly ville: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly dateAdhesion: string;
  readonly statut: StatutAdherent;
  readonly inscriptionPayee: boolean;
  readonly archive?: boolean;
  /** Version de concurrence optimiste, renvoyée telle quelle au `PUT /adherents/{id}` (#13). */
  readonly version?: number | null;
  /**
   * Workflow V19 : `VALIDE` = dossier officiel, modifiable uniquement par demande ; `EN_ATTENTE_VALIDATION` =
   * verrouillé. Absent d'une API antérieure à V19 : l'écran garde alors la modification directe.
   */
  readonly statutValidation?: StatutValidationEntite;
  /** Champ de cache toléré pour l'affichage — l'agent référent réel vit dans `affectation_portefeuille` (`01_SCHEMA_BDD.md`). */
  readonly agentReferentNom?: string | null;
}

/**
 * Ligne de la liste des adhérents — forme renvoyée par `GET /adherents` (`AdherentResumeDto`).
 *
 * Distincte d'{@link Adherent}, qui décrit la fiche complète. Les confondre était un défaut réel :
 * l'écran lisait `nom`, `prenoms` et `dateAdhesion`, qui n'existent pas dans la réponse de liste,
 * et affichait donc un tiret dans les colonnes « Adhérent », « Zone » et « Adhésion » pour
 * chaque ligne. Constaté en recette E2E au jalon J12.
 */
export interface AdherentResume {
  readonly id: string;
  readonly matricule: string;
  readonly nomComplet: string;
  readonly telephonePrincipal: string;
  readonly zoneId: string;
  readonly zoneLibelle: string | null;
  readonly dateAdhesion: string;
  readonly statut: StatutAdherent;
}

/**
 * Champs triables acceptés par `GET /adherents` (liste blanche `CHAMPS_TRI` du contrôleur, #8). Tout
 * autre nom renvoie `400 ADHERENT_TRI_INVALIDE` : le tri n'est jamais un nom de colonne libre.
 */
export type ChampTriAdherent = "NOM" | "MATRICULE" | "DATE_ADHESION" | "STATUT";
export type DirectionTri = "ASC" | "DESC";

/** Paramètres réels de `GET /adherents` (#1 à #8). */
export interface FiltresAdherents {
  /** #2 — nom, prénoms, matricule : recherche serveur. */
  recherche?: string;
  /** #4 — normalisé côté serveur. */
  telephone?: string;
  zoneId?: string;
  /** #6 — le périmètre de l'agent est vérifié par l'API. */
  agentId?: string;
  activiteId?: string;
  /** #5 */
  statut?: StatutAdherent;
  packId?: string;
  associationId?: string;
  dateAdhesionDu?: string;
  dateAdhesionAu?: string;
  /** #7 — bornes en pourcentage, évaluées par la formule serveur de complétion. */
  completionMin?: number;
  completionMax?: number;
  /** #8 */
  page?: number;
  taille?: number;
  tri?: ChampTriAdherent;
  direction?: DirectionTri;
}

function construireParametres(filtres: FiltresAdherents): string {
  const parametres = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    parametres.set(cle, String(valeur));
  }
  return parametres.toString();
}

/** #1 à #8 */
export function listerAdherents(filtres: FiltresAdherents) {
  const requete = construireParametres(filtres);
  return client.get<EnveloppeListe<AdherentResume>>(`/adherents${requete ? `?${requete}` : ""}`);
}

/** #12 */
export function obtenirAdherent(id: string) {
  return client.get<Adherent>(`/adherents/${id}`);
}

/**
 * #3 — recherche exacte par matricule. Route dédiée (`/matricule/{matricule}`) : `/{id}` attend un UUID.
 * `404` si le matricule n'existe pas **ou** s'il est hors du périmètre du demandeur.
 */
export function obtenirAdherentParMatricule(matricule: string) {
  return client.get<Adherent>(`/adherents/matricule/${encodeURIComponent(matricule)}`);
}

export interface CandidatDoublon {
  readonly adherentId: string;
  readonly matricule: string;
  readonly nomComplet: string;
  /** Toujours partiellement masqué par l'API — ne jamais tenter de le compléter côté client. */
  readonly telephone: string;
  readonly scoreSimilarite: number;
  readonly motifCorrespondance: string;
}

export interface ReponseVerificationDoublon {
  readonly candidats: readonly CandidatDoublon[];
}

/**
 * Contrat réel de `POST /adherents/verifier-doublon` (`VerifierDoublonDto` côté serveur).
 *
 * Corrigé au jalon J12 : le client envoyait `nom` et `prenoms` et **omettait `zoneId`**, qui est
 * obligatoire. L'appel répondait donc `400` à chaque fois et le bandeau informatif de doublon de
 * l'étape 3 ne s'affichait jamais. La détection restait assurée à la création (409), mais
 * l'avertissement préalable — celui qui évite la saisie inutile — était perdu.
 */
export interface CorpsVerificationDoublon {
  nomComplet: string;
  telephonePrincipal?: string;
  numeroCni?: string;
  zoneId: string;
}

/** #10 */
export function verifierDoublon(corps: CorpsVerificationDoublon) {
  return client.post<ReponseVerificationDoublon>("/adherents/verifier-doublon", corps);
}

export interface CorpsCreationAdherent {
  nom: string;
  prenoms?: string;
  dateNaissance?: string;
  sexe?: Sexe;
  telephonePrincipal: string;
  telephoneSecondaire?: string;
  whatsapp?: string;
  email?: string;
  numeroCni?: string;
  numeroCnps?: string;
  activiteId: string;
  zoneId: string;
  associationId?: string;
  localisation: string;
  quartier?: string;
  ville?: string;
  dateAdhesion: string;
  // V22 : plus de `packId` — le pack se choisit à la première cotisation (`POST /paiements`).
  /** Envoyé uniquement après confirmation explicite d'un doublon signalé en 409 (`03_SPECIFICATIONS_API.md §3`). */
  confirmationDoublonIgnore?: boolean;
}

/** #9, #11 — le matricule est généré par le serveur et renvoyé dans la réponse. */
export function creerAdherent(corps: CorpsCreationAdherent) {
  return client.post<Adherent>("/adherents", corps);
}

/**
 * `ModificationAdherentDto` (#13). Le `PUT` **remplace** chaque champ : un champ omis est effacé côté
 * serveur. L'écran envoie donc toujours la fiche complète, champs non édités compris.
 */
export interface CorpsModificationAdherent {
  nom: string;
  prenoms: string | null;
  dateNaissance: string | null;
  sexe: Sexe | null;
  telephonePrincipal: string;
  telephoneSecondaire: string | null;
  /** V22 : toujours renvoyés — le `PUT` les effacerait sinon. */
  whatsapp: string | null;
  email: string | null;
  numeroCni: string | null;
  numeroCnps: string | null;
  activiteId: string | null;
  associationId: string | null;
  localisation: string | null;
  quartier: string | null;
  ville: string | null;
  latitude: number | null;
  longitude: number | null;
  version: number | null;
}

/** #13 */
export function modifierAdherent(id: string, corps: CorpsModificationAdherent) {
  return client.put<Adherent>(`/adherents/${id}`, corps);
}

/** #33 — `204`. Motif obligatoire ; `409` si le statut est inchangé ou si l'adhérent est radié. */
export function changerStatutAdherent(id: string, statut: StatutAdherent, motif: string) {
  return client.post<void>(`/adherents/${id}/statut`, { statut, motif });
}

/** Archivage logique (`ADHERENT:ARCHIVER`) — `204`, motif obligatoire, jamais une suppression. */
export function archiverAdherent(id: string, motif: string) {
  return client.post<void>(`/adherents/${id}/archiver`, { motif });
}

/** `ChampManquantDto` : `cle` est une entrée du paramètre `[V]` `CHAMPS_COMPLETION_ADHERENT`. */
export interface ChampManquant {
  readonly cle: string;
  readonly libelle: string;
}

/** `CompletionAdherentDto` (#14). Le pourcentage est calculé par le serveur, jamais ici. */
export interface CompletionAdherent {
  readonly adherentId: string;
  readonly pourcentage: number;
  readonly champsRenseignes: number;
  readonly champsTotal: number;
  readonly champsManquants: readonly ChampManquant[];
  readonly avertissements: readonly string[];
}

/** #14 */
export function obtenirCompletion(id: string) {
  return client.get<CompletionAdherent>(`/adherents/${id}/completion`);
}

/** #15 */
export function obtenirChampsManquants(id: string) {
  return client.get<ChampManquant[]>(`/adherents/${id}/champs-manquants`);
}

/**
 * `CompleterProfilAdherentDto` (#16) : seuls les champs fournis (non nuls, non vides) sont appliqués.
 * Aucun champ obligatoire — on renseigne progressivement ce que `/champs-manquants` signale.
 */
export interface CorpsCompletionProfil {
  dateNaissance?: string;
  sexe?: Sexe;
  telephoneSecondaire?: string;
  whatsapp?: string;
  email?: string;
  numeroCni?: string;
  numeroCnps?: string;
  associationId?: string;
  quartier?: string;
  ville?: string;
  latitude?: number;
  longitude?: number;
  consentementDonnees: boolean;
}

/** #16 */
export function completerProfil(id: string, corps: CorpsCompletionProfil) {
  return client.patch<Adherent>(`/adherents/${id}/profil`, corps);
}

/** `DossierAdherentDto` (#17) : vue composite statut + complétion + documents manquants. */
export interface EtatDossierAdherent {
  readonly adherentId: string;
  readonly statut: StatutAdherent;
  readonly completionPourcentage: number;
  readonly champsManquants: readonly ChampManquant[];
  readonly documentsManquants: readonly TypeDocument[];
  readonly avertissements: readonly string[];
}

/** #17 */
export function obtenirEtatDossier(id: string) {
  return client.get<EtatDossierAdherent>(`/adherents/${id}/dossier`);
}

/** #18 — types de pièces exigées (paramètre `[V]` `DOCUMENTS_ADHERENT_OBLIGATOIRES`) encore absentes. */
export function obtenirDocumentsManquants(id: string) {
  return client.get<TypeDocument[]>(`/adherents/${id}/documents-manquants`);
}

/** `AuditLigneDto` (#21) — journal d'audit restreint à cet adhérent, du plus récent au plus ancien. */
export interface EvenementHistorique {
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

/** #21 */
export function obtenirHistorique(id: string) {
  return client.get<EvenementHistorique[]>(`/adherents/${id}/historique`);
}

/** `AgentDto` (#22), réduit aux champs affichés sur la fiche. */
export interface AgentResponsable {
  readonly id: string;
  readonly codeAgent: string;
  readonly nomComplet: string;
  readonly telephone: string;
  readonly zoneId: string | null;
  readonly actif: boolean;
}

/** #22 — `404 ADHERENT_SANS_AGENT` quand aucune affectation n'est ouverte. */
export function obtenirAgentResponsable(id: string) {
  return client.get<AgentResponsable>(`/adherents/${id}/agent`);
}

/**
 * `ResumeCotisationsAdherentDto` (#28). `seuilEligibiliteCnps` est `null` une fois le seuil atteint : le
 * serveur ne le reconstitue que tant qu'il est exact. `pourcentageProgression` est `null` quand il ne peut
 * pas être calculé — jamais remplacé par une estimation côté client.
 */
export interface ResumeCotisationsAdherent {
  readonly adherentId: string;
  readonly montantValide: number;
  readonly montantEnAttente: number;
  readonly seuilEligibiliteCnps: number | null;
  readonly resteAvantSeuil: number;
  readonly pourcentageProgression: number | null;
  readonly eligibleCnps: boolean;
  readonly couvertJusquAu: string | null;
  readonly avertissements: readonly string[];
}

/** #28 (et #27 : `eligibleCnps` y est l'éligibilité calculée par le serveur). */
export function obtenirResumeCotisations(id: string) {
  return client.get<ResumeCotisationsAdherent>(`/adherents/${id}/resume-cotisations`);
}

/** `ProfilProfessionnelDto` (#29). */
export interface ProfilProfessionnel {
  readonly adherentId: string;
  readonly activiteId: string | null;
  readonly numeroCnps: string | null;
  readonly associationId: string | null;
  readonly packIdCourant: string | null;
}

/** #29 */
export function obtenirProfessionnel(id: string) {
  return client.get<ProfilProfessionnel>(`/adherents/${id}/professionnel`);
}

/** `ModifierProfessionnelDto` (#30). Le pack ne se change pas ici. */
export interface CorpsModificationProfessionnel {
  activiteId: string | null;
  numeroCnps: string | null;
  associationId: string | null;
}

/** #30 */
export function modifierProfessionnel(id: string, corps: CorpsModificationProfessionnel) {
  return client.put<Adherent>(`/adherents/${id}/professionnel`, corps);
}

/** `CoordonneesAdherentDto` (#31). */
export interface CoordonneesAdherent {
  readonly adherentId: string;
  readonly telephonePrincipal: string;
  readonly telephoneSecondaire: string | null;
  readonly whatsapp?: string | null;
  readonly email?: string | null;
  readonly numeroCni: string | null;
  readonly localisation: string | null;
  readonly quartier: string | null;
  readonly ville: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

/** #31 */
export function obtenirCoordonnees(id: string) {
  return client.get<CoordonneesAdherent>(`/adherents/${id}/coordonnees`);
}

/** `ModifierCoordonneesDto` (#32) — remplace chaque champ, comme le `PUT` de la fiche. */
export interface CorpsModificationCoordonnees {
  telephonePrincipal: string;
  telephoneSecondaire: string | null;
  whatsapp: string | null;
  email: string | null;
  numeroCni: string | null;
  localisation: string;
  quartier: string | null;
  ville: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** #32 */
export function modifierCoordonnees(id: string, corps: CorpsModificationCoordonnees) {
  return client.put<Adherent>(`/adherents/${id}/coordonnees`, corps);
}

/**
 * La situation de droits d'un adhérent (couvert jusqu'au, jours de retard,
 * cumul cotisé, éligibilité CNPS…) vivait ici depuis J2
 * (`GET /adherents/{id}/situation`, documenté par
 * `03_SPECIFICATIONS_API.md §3`). J6 introduit le domaine `droits` dédié
 * (`§5`, `GET /droits/adherents/{id}`), à la forme de réponse identique :
 * consolidé là-bas plutôt que maintenu en double ici — voir
 * `src/api/droits.ts` et `Conception/SUIVI_EXECUTION.md`.
 */

/** Une activité du référentiel COSITI (table `activite`, sept lignes livrées par la migration V2). */
export interface Activite {
  readonly id: string;
  readonly code: string;
  readonly libelle: string;
  readonly categorie: string;
}

/**
 * Référentiel des activités.
 *
 * `activiteId` est un UUID obligatoire côté API : sans cette liste, l'écran de création ne
 * pouvait proposer qu'une saisie libre que le serveur refusait systématiquement.
 */
export function listerActivites() {
  return client.get<Activite[]>("/activites");
}

/** Association partenaire (V21, `AssociationDto`) — référentiel en lecture seule, tenu côté serveur. */
export interface Association {
  readonly id: string;
  readonly code: string;
  readonly nom: string;
  readonly type: string | null;
  readonly contactNom: string | null;
  readonly contactTelephone: string | null;
  readonly zoneId: string | null;
  readonly dateConvention: string | null;
  readonly active: boolean;
}

/** `GET /associations` (`ADHERENT:LIRE`) : actives et inactives, triées par nom. */
export function listerAssociations() {
  return client.get<Association[]>("/associations");
}

/** Un pack de cotisation du référentiel COSITI (table `pack`, deux lignes livrées par la migration V2). */
export interface Pack {
  readonly id: string;
  readonly code: string;
  readonly libelle: string;
  readonly montantJournalier: number;
  readonly montantMensuelEquivalent: number;
  readonly seuilEligibiliteCnps: number;
  readonly actif: boolean;
}

/**
 * Référentiel des packs. Renvoie aussi les packs inactifs (avec leur drapeau) : un adhérent
 * rattaché à un pack retiré du catalogue doit rester affichable. C'est à l'écran de création
 * de n'en proposer que les actifs.
 */
export function listerPacks() {
  return client.get<Pack[]>("/packs");
}
