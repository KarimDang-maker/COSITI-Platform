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
