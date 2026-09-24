/**
 * COSITI — Domaine « CNPS » (J7).
 *
 * Contrat vérifié directement dans le code backend réel
 * (`COSITI_Backend/src/main/java/cm/cositi/api/cnps/`), livré dans le même lot —
 * même méthode qu'en J3/J4/J6. Aucune règle métier ici : l'éligibilité, les
 * pièces manquantes et le montant d'une déclaration viennent tous de l'API
 * (`AGENTS.md` règle 2).
 *
 * Point d'attention repris de l'API : `DossierCnps.avertissements` et
 * `DeclarationCnps.avertissements` portent les règles marquées `[V]` non
 * validées par la COSITI (composition du dossier, assiette de cotisation).
 * Ils sont affichés tels quels par les écrans via `AvertissementRegle` — jamais
 * masqués, jamais réécrits côté client.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";

/** `StatutDossierCnps` (backend). Mêmes valeurs que le domaine `dossierCnps` de `src/lib/statuts.ts`. */
export type StatutDossierCnps =
  | "BROUILLON"
  | "INCOMPLET"
  | "PRET"
  | "TRANSMIS"
  | "TRAITE"
  | "REJETE";

/** `StatutPieceCnps` (backend). Domaine `pieceCnps` de `src/lib/statuts.ts`. */
export type StatutPieceCnps = "ATTENDUE" | "FOURNIE" | "VALIDEE" | "REJETEE";

/** `TypePieceCnps` (backend) — cinq valeurs, issues de `V4__cnps_documents_relances.sql`. */
export type TypePieceCnps =
  | "CNI_RECTO"
  | "CNI_VERSO"
  | "ACTE_NAISSANCE"
  | "PHOTO_IDENTITE"
  | "FORMULAIRE_SIGNE";

/** `StatutDeclarationCnps` (backend). */
export type StatutDeclarationCnps = "A_PRODUIRE" | "TRANSMISE" | "ACCUSEE" | "REJETEE";

export const LIBELLES_TYPE_PIECE: Readonly<Record<TypePieceCnps, string>> = {
  CNI_RECTO: "CNI — recto",
  CNI_VERSO: "CNI — verso",
  ACTE_NAISSANCE: "Acte de naissance",
  PHOTO_IDENTITE: "Photo d'identité",
  FORMULAIRE_SIGNE: "Formulaire signé",
};

export interface PieceDossierCnps {
  readonly id: string;
  readonly dossierId: string;
  readonly typePiece: TypePieceCnps;
  readonly documentId: string | null;
  readonly statut: StatutPieceCnps;
  readonly obligatoire: boolean;
}

export interface PieceManquante {
  readonly typePiece: TypePieceCnps;
  readonly statutActuel: StatutPieceCnps;
}

export interface DossierCnps {
  readonly id: string;
  readonly adherentId: string;
  readonly numeroImmatriculation: string | null;
  readonly dateImmatriculation: string | null;
  readonly revenuMensuelDeclare: number | null;
  readonly statut: StatutDossierCnps;
  readonly motifRejet: string | null;
  readonly pieces: readonly PieceDossierCnps[];
  readonly piecesManquantes: readonly PieceManquante[];
  readonly creeLe: string;
  readonly creePar: string | null;
  readonly avertissements: readonly string[];
}

export interface DeclarationCnps {
  readonly id: string;
  readonly dossierId: string;
  readonly periodeMois: string;
  readonly montantDeclare: number;
  readonly statut: StatutDeclarationCnps;
  readonly dateTransmission: string | null;
  readonly accuseDocumentId: string | null;
  readonly creePar: string | null;
  readonly avertissements: readonly string[];
}

export interface AdherentEligibleCnps {
  readonly adherentId: string;
  readonly matricule: string;
  readonly nomComplet: string;
  readonly packCode: string;
  readonly cumulCotise: number;
  readonly seuilEligibilite: number;
  readonly dossierOuvert: boolean;
}

export interface FiltresDossiers {
  statut?: StatutDossierCnps;
  page?: number;
  taille?: number;
}

function parametres(filtres: Record<string, unknown>): string {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    requete.set(cle, String(valeur));
  }
  const texte = requete.toString();
  return texte ? `?${texte}` : "";
}

export function listerDossiers(filtres: FiltresDossiers) {
  return client.get<EnveloppeListe<DossierCnps>>(`/cnps/dossiers${parametres({ ...filtres })}`);
}

export function obtenirDossier(dossierId: string) {
  return client.get<DossierCnps>(`/cnps/dossiers/${dossierId}`);
}

/**
 * `adherentId` est un paramètre de requête, pas un corps JSON — le contrôleur backend le lit en
 * `@RequestParam`. Répond `409 CNPS_DOSSIER_EXISTANT` si un dossier existe déjà pour cet adhérent.
 */
export function ouvrirDossier(adherentId: string) {
  return client.post<DossierCnps>(`/cnps/dossiers${parametres({ adherentId })}`, undefined);
}

export function ajouterPiece(dossierId: string, documentId: string, typePiece: TypePieceCnps) {
  return client.post<DossierCnps>(`/cnps/dossiers/${dossierId}/pieces`, { documentId, typePiece });
}

export function changerStatutDossier(
  dossierId: string,
  statut: StatutDossierCnps,
  commentaire?: string,
) {
  return client.post<DossierCnps>(`/cnps/dossiers/${dossierId}/statut`, { statut, commentaire });
}

export function listerEligiblesNonImmatricules(zoneId?: string) {
  return client.get<AdherentEligibleCnps[]>(
    `/cnps/eligibles-non-immatricules${parametres({ zoneId })}`,
  );
}

export function listerDeclarations(dossierId: string) {
  return client.get<DeclarationCnps[]>(`/cnps/declarations${parametres({ dossierId })}`);
}

/** `periode` au format `AAAA-MM` (ex. `2026-09`) — validé côté serveur, 400 `CNPS_PERIODE_INVALIDE` sinon. */
export function preparerDeclaration(dossierId: string, periode: string) {
  return client.post<DeclarationCnps>(
    `/cnps/declarations${parametres({ dossierId, periode })}`,
    undefined,
  );
}

/**
 * L'accusé de réception est facultatif et passe en paramètre de requête : le backend ne l'accepte
 * **pas** en corps JSON (un corps optionnel produisait un 500, corrigé côté serveur dans ce même lot).
 */
export function transmettreDeclaration(declarationId: string, accuseDocumentId?: string) {
  return client.post<DeclarationCnps>(
    `/cnps/declarations/${declarationId}/transmettre${parametres({ accuseDocumentId })}`,
    undefined,
  );
}

/* ============================================================================
 * Dossiers de prestation CNPS (allocations familiales, PVID, risques
 * professionnels) — module Gestionnaire des comptes. Distinct des dossiers
 * d'immatriculation ci-dessus : un adhérent immatriculé peut avoir plusieurs
 * dossiers de prestation dans le temps, chacun rattaché à une offre d'une
 * rubrique (PF/RP/PVID). Contrat vérifié directement dans
 * `ControleurCnps.java`/`ServiceDossierPrestationCnpsImpl.java` (backend,
 * même lot).
 * ========================================================================== */

/** Code de rubrique CNPS (`offre_cnps.rubrique`, V16). */
export type RubriqueCnps = "PF" | "RP" | "PVID";

/** `StatutDossierPrestationCnps` (backend). Domaine `dossierPrestationCnps` de `src/lib/statuts.ts`. */
export type StatutDossierPrestationCnps = "INCOMPLET" | "COMPLET" | "TRANSMIS_CNPS" | "TRAITE" | "REJETE";

export interface PieceOffreCnps {
  readonly id: string;
  readonly offreId: string;
  readonly libelle: string;
  readonly obligatoire: boolean;
}

export interface OffreCnps {
  readonly id: string;
  readonly rubrique: RubriqueCnps;
  readonly code: string;
  readonly libelle: string;
  readonly description: string | null;
  readonly delaiLibelle: string | null;
  readonly badgeMetier: string | null;
  readonly ordreAffichage: number;
  readonly pieces: readonly PieceOffreCnps[];
  /** Compté par le serveur — jamais recalculé côté client (`docs/02_DESIGN_SYSTEM.md`, règle 2 `AGENTS.md`). */
  readonly nombreDossiers: number;
}

export interface PieceDossierPrestationCnps {
  readonly id: string;
  readonly dossierId: string;
  readonly pieceOffreId: string;
  readonly libellePiece: string;
  readonly obligatoire: boolean;
  readonly documentId: string | null;
  readonly statut: StatutPieceCnps;
  readonly note: string | null;
}

export interface PieceManquantePrestation {
  readonly pieceOffreId: string;
  readonly libelle: string;
  readonly statutActuel: StatutPieceCnps;
}

export interface DossierPrestationCnps {
  readonly id: string;
  readonly adherentId: string;
  readonly adherentMatricule: string | null;
  readonly adherentNomComplet: string | null;
  readonly numeroCnps: string | null;
  readonly offreId: string;
  readonly offreCode: string;
  readonly offreLibelle: string;
  readonly rubrique: RubriqueCnps;
  readonly statut: StatutDossierPrestationCnps;
  readonly nombrePersonnesACharge: number | null;
  readonly dateDepot: string | null;
  readonly dateTransmissionCnps: string | null;
  readonly prochaineRelanceLe: string | null;
  readonly observations: string | null;
  readonly motifRejet: string | null;
  readonly pieces: readonly PieceDossierPrestationCnps[];
  readonly piecesManquantes: readonly PieceManquantePrestation[];
  readonly creeLe: string;
  readonly creePar: string | null;
}

/**
 * Journal d'activité du dossier — jamais `/audit` (réservé `AUDIT:CONSULTER`, PCA/Super Administrateur).
 * Ne trace que les transitions de statut : pas de ligne « réception de pièce »/« relance téléphonique »
 * distincte, le backend ne les enregistre pas comme des événements séparés à ce jour.
 */
export interface HistoriqueDossierPrestationCnps {
  readonly id: string;
  readonly statutAvant: StatutDossierPrestationCnps | null;
  readonly statutApres: StatutDossierPrestationCnps;
  readonly auteurId: string | null;
  readonly horodatage: string;
  readonly commentaire: string | null;
}

/**
 * Situation d'un adhérent face au seuil d'immatriculation CNPS de son pack, qu'il soit déjà immatriculé
 * ou non — `GET /cnps/immatriculations`, écran Immatriculations (3 onglets dérivés côté client de
 * `numeroCnps`, cf. `EcranImmatriculations.tsx`).
 */
export interface SituationImmatriculationCnps {
  readonly adherentId: string;
  readonly matricule: string;
  readonly nomComplet: string;
  readonly profession: string | null;
  readonly telephone: string | null;
  readonly cumulCotise: number;
  readonly seuilEligibilite: number;
  readonly numeroCnps: string | null;
  readonly dateImmatriculation: string | null;
  readonly dossierOuvert: boolean;
}

export interface FiltresDossiersPrestation {
  rubrique?: RubriqueCnps;
  offreId?: string;
  statut?: StatutDossierPrestationCnps;
  recherche?: string;
  page?: number;
  taille?: number;
}

export function listerOffres(rubrique?: RubriqueCnps) {
  return client.get<OffreCnps[]>(`/cnps/offres${parametres({ rubrique })}`);
}

export function listerDossiersPrestation(filtres: FiltresDossiersPrestation) {
  return client.get<EnveloppeListe<DossierPrestationCnps>>(
    `/cnps/dossiers-prestation${parametres({ ...filtres })}`,
  );
}

export function obtenirDossierPrestation(dossierId: string) {
  return client.get<DossierPrestationCnps>(`/cnps/dossiers-prestation/${dossierId}`);
}

export interface CreationDossierPrestation {
  adherentId: string;
  offreId: string;
  nombrePersonnesACharge?: number;
}

export function ouvrirDossierPrestation(dto: CreationDossierPrestation) {
  return client.post<DossierPrestationCnps>("/cnps/dossiers-prestation", dto);
}

export function ajouterPiecePrestation(dossierId: string, documentId: string, pieceOffreId: string) {
  return client.post<DossierPrestationCnps>(`/cnps/dossiers-prestation/${dossierId}/pieces`, {
    documentId,
    pieceOffreId,
  });
}

export function changerStatutDossierPrestation(
  dossierId: string,
  statut: StatutDossierPrestationCnps,
  commentaire?: string,
) {
  return client.post<DossierPrestationCnps>(`/cnps/dossiers-prestation/${dossierId}/statut`, {
    statut,
    commentaire,
  });
}

export function modifierObservationsPrestation(
  dossierId: string,
  observations: string | undefined,
  prochaineRelanceLe: string | undefined,
) {
  return client.post<DossierPrestationCnps>(`/cnps/dossiers-prestation/${dossierId}/observations`, {
    observations,
    prochaineRelanceLe,
  });
}

export function piecesManquantesPrestation(dossierId: string) {
  return client.get<PieceManquantePrestation[]>(`/cnps/dossiers-prestation/${dossierId}/pieces-manquantes`);
}

export function journalDossierPrestation(dossierId: string) {
  return client.get<HistoriqueDossierPrestationCnps[]>(`/cnps/dossiers-prestation/${dossierId}/journal`);
}

export function listerSituationsImmatriculation(zoneId?: string) {
  return client.get<SituationImmatriculationCnps[]>(`/cnps/immatriculations${parametres({ zoneId })}`);
}
