/**
 * COSITI — Domaine « Documents » (J7).
 *
 * Contrat vérifié dans le code backend réel
 * (`COSITI_Backend/src/main/java/cm/cositi/api/document/`).
 *
 * Deux choses que ce module ne fait **pas**, volontairement :
 *  - il ne devine jamais le type d'un fichier à partir de son extension. Le
 *    serveur le détermine par signature binaire et renvoie `400
 *    DOCUMENT_TYPE_NON_AUTORISE` s'il ne le reconnaît pas ; le client se
 *    contente de transmettre le fichier et d'afficher le refus ;
 *  - il ne construit aucune URL de contenu directement affichable. Il n'existe
 *    pas d'URL publique ni de lien signé : chaque téléchargement repasse par
 *    l'API, avec le jeton, et est journalisé côté serveur
 *    (`04_SECURITE.md §4`).
 */
import { client, type FichierRecu } from "@/api/client";

/** `TypeDocument` (backend). Les quatre derniers types viennent de la matrice documentaire V21. */
export type TypeDocument =
  | "CNI"
  | "ACTE_NAISSANCE"
  | "PREUVE_PAIEMENT"
  | "ACCUSE_CNPS"
  | "JUSTIFICATIF_RESIDENCE"
  | "PIECE_PROFESSIONNELLE"
  | "PIECE_CNPS"
  | "FORMULAIRE_ADHESION"
  | "AUTRE";

/** `StatutDocument` (backend). Domaine `document` de `src/lib/statuts.ts`. `REMPLACE` : version conservée (V21). */
export type StatutDocument = "AJOUTE" | "VERIFIE" | "REJETE" | "ARCHIVE" | "REMPLACE";

/** `AnalyseAntivirus` (backend). Domaine `analyseAntivirus` de `src/lib/statuts.ts`. */
export type AnalyseAntivirus = "EN_ATTENTE" | "PROPRE" | "INFECTE";

export const LIBELLES_TYPE_DOCUMENT: Readonly<Record<TypeDocument, string>> = {
  CNI: "Carte nationale d'identité",
  ACTE_NAISSANCE: "Acte de naissance",
  PREUVE_PAIEMENT: "Preuve de paiement",
  ACCUSE_CNPS: "Accusé CNPS",
  JUSTIFICATIF_RESIDENCE: "Justificatif de résidence",
  PIECE_PROFESSIONNELLE: "Pièce professionnelle",
  PIECE_CNPS: "Pièce CNPS",
  FORMULAIRE_ADHESION: "Formulaire d'adhésion",
  AUTRE: "Autre document",
};

/**
 * Formats acceptés par le serveur (liste blanche de `SignatureBinaire`). Repris ici pour l'attribut
 * `accept` du sélecteur de fichier — confort de saisie uniquement : la décision reste serveur.
 */
export const FORMATS_ACCEPTES = "image/jpeg,image/png,application/pdf";

export interface Document {
  readonly id: string;
  readonly typeDocument: TypeDocument;
  readonly nomFichierOriginal: string;
  readonly typeMime: string;
  readonly tailleOctets: number;
  readonly chiffre: boolean;
  readonly adherentId: string | null;
  readonly paiementId: string | null;
  readonly statut: StatutDocument;
  readonly analyseAntivirus: AnalyseAntivirus;
  readonly telechargeable: boolean;
  readonly creeLe: string;
  readonly creePar: string | null;
  /** Versionnement (V21, §22) : n° de version, version remplacée et motif du remplacement. */
  readonly versionDocument?: number;
  readonly remplaceDocumentId?: string | null;
  readonly motifRemplacement?: string | null;
  /** Validité (V21, §21) quand elle s'applique au type de pièce ; `expire` est calculé par le serveur. */
  readonly valideDu?: string | null;
  readonly valideJusquau?: string | null;
  readonly expire?: boolean;
  readonly verifiePar?: string | null;
  readonly verifieLe?: string | null;
  readonly commentaireVerification?: string | null;
}

/** Options du téléversement (V21) : validité de la pièce et remplacement versionné (motif obligatoire). */
export interface OptionsTeleversement {
  valideDu?: string;
  valideJusquau?: string;
  remplaceDocumentId?: string;
  motifRemplacement?: string;
}

export interface CibleDocument {
  adherentId?: string;
  paiementId?: string;
}

function parametres(valeurs: Record<string, unknown>): string {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(valeurs)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    requete.set(cle, String(valeur));
  }
  const texte = requete.toString();
  return texte ? `?${texte}` : "";
}

/**
 * Le rattachement (`adherentId` **ou** `paiementId`, jamais les deux) passe en paramètre de requête et non
 * en partie JSON du multipart : une partie JSON impose au client de fixer un `Content-Type` par partie, ce
 * que les navigateurs gèrent de façon inégale.
 */
export function televerserDocument(
  fichier: File,
  type: TypeDocument,
  cible: CibleDocument,
  options: OptionsTeleversement = {},
) {
  const formulaire = new FormData();
  formulaire.append("fichier", fichier);
  return client.postFormulaire<Document>(
    `/documents${parametres({ type, ...cible, ...options })}`,
    formulaire,
  );
}

export function listerDocuments(cible: CibleDocument) {
  return client.get<Document[]>(`/documents${parametres({ ...cible })}`);
}

export function obtenirMetadonnees(documentId: string) {
  return client.get<Document>(`/documents/${documentId}/metadonnees`);
}

export function telechargerDocument(documentId: string): Promise<FichierRecu> {
  return client.telechargerFichier(`/documents/${documentId}`);
}

export function changerStatutDocument(documentId: string, statut: StatutDocument, motif?: string) {
  return client.post<Document>(`/documents/${documentId}/statut`, { statut, motif });
}
