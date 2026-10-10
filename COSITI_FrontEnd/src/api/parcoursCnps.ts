/**
 * COSITI — Domaine « Parcours CNPS » : préimmatriculation par vagues mensuelles, dépôt du dossier physique au CPS,
 * immatriculation définitive, paramètres et checklist d'archivage.
 *
 * Contrat : `COSITI_Backend/src/main/java/cm/cositi/api/cnps/parcours/` et `.../cnps/archivage/`. Aucune règle
 * métier ici (`AGENTS.md` règle 2) : quotas, fenêtres, retards, reports, délai de dépôt et éligibilité sont tous
 * calculés par l'API. L'écran affiche la réponse ; il ne compare jamais un montant au quota.
 */
import { client } from "@/api/client";

/** Filtres de `GET /cnps/parcours`. */
export type FiltreParcours =
  | "TOUS"
  | "A_PREIMMATRICULER"
  | "EN_RETARD"
  | "REPORTES"
  | "DELAI_DEPOT"
  | "DEPOT_HORS_DELAI"
  | "IMMAT_ELIGIBLES"
  | "IMMAT_NON_ELIGIBLES"
  | "IMMATRICULES"
  | "PIECES_MANQUANTES";

export const FILTRES_PARCOURS: readonly { valeur: FiltreParcours; libelle: string }[] = [
  { valeur: "TOUS", libelle: "Tous les adhérents" },
  { valeur: "A_PREIMMATRICULER", libelle: "À préimmatriculer" },
  { valeur: "EN_RETARD", libelle: "En retard" },
  { valeur: "REPORTES", libelle: "Reportés à la vague suivante" },
  { valeur: "DELAI_DEPOT", libelle: "Dépôt du dossier en cours" },
  { valeur: "DEPOT_HORS_DELAI", libelle: "Dépôt hors délai" },
  { valeur: "IMMAT_ELIGIBLES", libelle: "Éligibles à l'immatriculation" },
  { valeur: "IMMAT_NON_ELIGIBLES", libelle: "Non éligibles à l'immatriculation" },
  { valeur: "IMMATRICULES", libelle: "Immatriculés" },
  { valeur: "PIECES_MANQUANTES", libelle: "Pièces d'archivage manquantes" },
];

export type EtapeParcours =
  | "NON_ELIGIBLE"
  | "ELIGIBLE_PREIMMAT"
  | "PREIMMATRICULE"
  | "DOSSIER_DEPOSE"
  | "IMMATRICULE";

export type FenetreParcours = "FENETRE_1" | "FENETRE_2";

export const LIBELLES_FENETRE: Readonly<Record<FenetreParcours, string>> = {
  FENETRE_1: "Fenêtre 1",
  FENETRE_2: "Fenêtre 2",
};

/** `SituationParcoursDto` : la situation d'un adhérent dans le parcours CNPS. */
export interface SituationParcours {
  readonly adherentId: string;
  readonly matricule: string;
  readonly nomComplet: string;
  readonly zoneId: string | null;
  readonly cumulCotise: number;
  readonly etape: EtapeParcours;
  readonly fenetre: FenetreParcours;
  readonly enRetard: boolean;
  readonly reporte: boolean;
  readonly nbReports: number;
  readonly vagueMois: string | null;
  readonly horsDelaiDepot: boolean;
  readonly joursRestantsDepot: number | null;
  readonly eligibleImmat: boolean;
  readonly resteAvantPreimmat: number;
  readonly resteAvantImmat: number;
  readonly datePreimmatriculation: string | null;
  readonly numeroTemporaire: string | null;
  readonly dateLimiteDepot: string | null;
  readonly dateDepotCps: string | null;
  readonly depotHorsDelai: boolean;
  readonly cps: string | null;
  readonly numeroImmatriculation: string | null;
  readonly dateImmatriculation: string | null;
  readonly dossierId: string | null;
  readonly piecesManquantes: number;
  readonly piecesBloquantes: number;
}

/** `GET /cnps/parcours/resume` — compteurs et paramètres en vigueur, tels que servis. */
export interface ResumeParcours {
  readonly aPreimmatriculer: number;
  readonly enRetard: number;
  readonly reportes: number;
  readonly delaiDepotEnCours: number;
  readonly delaiDepotDepasse: number;
  readonly dossiersDeposes: number;
  readonly eligiblesImmat: number;
  readonly nonEligiblesImmat: number;
  readonly immatricules: number;
  readonly dossiersPiecesManquantes: number;
  readonly quotaPreimmat: number;
  readonly quotaImmat: number;
  readonly jourCoupure: number;
  readonly delaiDepotJours: number;
  readonly fenetreCourante: FenetreParcours;
}

export interface CorpsPreimmatriculation {
  numeroTemporaire: string;
  datePreimmatriculation?: string;
  recepisseDocumentId?: string;
}

export interface CorpsDepotDossier {
  dateDepot?: string;
  cps: string;
}

export interface CorpsImmatriculation {
  numeroImmatriculation: string;
  dateImmatriculation?: string;
}

/** `GET`/`PUT /cnps/parametres`. `motif` est `null` en lecture, obligatoire en écriture. */
export interface ParametresCnps {
  readonly quotaPreimmat: number;
  readonly quotaImmat: number;
  readonly jourCoupure: number;
  readonly delaiDepotJours: number;
  readonly motif: string | null;
}

export interface CorpsParametresCnps {
  quotaPreimmat: number;
  quotaImmat: number;
  jourCoupure: number;
  delaiDepotJours: number;
  motif: string;
}

export type StatutArchivage = "NON_FOURNIE" | "FOURNIE" | "VERIFIEE" | "ARCHIVEE";

export interface LigneChecklistArchivage {
  readonly codePiece: string;
  readonly libelle: string;
  readonly bloquante: boolean;
  readonly statut: StatutArchivage;
  readonly documentId: string | null;
  readonly nomFichier: string | null;
  readonly referencePhysique: string | null;
  readonly motif: string | null;
  readonly modifieLe: string | null;
  readonly modifiePar: string | null;
}

export interface ChecklistArchivageDossier {
  readonly dossierId: string;
  readonly adherentId: string;
  readonly lignes: readonly LigneChecklistArchivage[];
  readonly piecesBloquantes: number;
  readonly piecesBloquantesPretes: number;
  readonly complete: boolean;
}

export interface CorpsChangementArchivage {
  statut: StatutArchivage;
  documentId?: string;
  referencePhysique?: string;
  motif?: string;
}

export interface DossierArchivageIncomplet {
  readonly dossierId: string;
  readonly adherentId: string;
  readonly matricule: string;
  readonly nomComplet: string;
  readonly piecesManquantes: readonly string[];
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

export function listerParcours(filtre: FiltreParcours = "TOUS", zoneId?: string) {
  return client.get<SituationParcours[]>(`/cnps/parcours${parametres({ filtre, zoneId })}`);
}

export function obtenirResumeParcours(zoneId?: string) {
  return client.get<ResumeParcours>(`/cnps/parcours/resume${parametres({ zoneId })}`);
}

export function obtenirParcoursAdherent(adherentId: string) {
  return client.get<SituationParcours>(`/cnps/parcours/adherents/${adherentId}`);
}

export function preimmatriculer(adherentId: string, corps: CorpsPreimmatriculation) {
  return client.post<SituationParcours>(`/cnps/parcours/adherents/${adherentId}/preimmatriculer`, corps);
}

export function enregistrerDepotDossier(adherentId: string, corps: CorpsDepotDossier) {
  return client.post<SituationParcours>(`/cnps/parcours/adherents/${adherentId}/depot-dossier`, corps);
}

export function immatriculer(adherentId: string, corps: CorpsImmatriculation) {
  return client.post<SituationParcours>(`/cnps/parcours/adherents/${adherentId}/immatriculer`, corps);
}

export function obtenirParametresCnps() {
  return client.get<ParametresCnps>("/cnps/parametres");
}

export function modifierParametresCnps(corps: CorpsParametresCnps) {
  return client.put<ParametresCnps>("/cnps/parametres", corps);
}

export function obtenirChecklistArchivage(dossierId: string) {
  return client.get<ChecklistArchivageDossier>(`/cnps/dossiers/${dossierId}/checklist-archivage`);
}

export function changerPieceArchivage(dossierId: string, codePiece: string, corps: CorpsChangementArchivage) {
  return client.patch<ChecklistArchivageDossier>(
    `/cnps/dossiers/${dossierId}/checklist-archivage/${encodeURIComponent(codePiece)}`,
    corps,
  );
}

export function listerDossiersArchivageIncomplets() {
  return client.get<DossierArchivageIncomplet[]>("/cnps/archivage/dossiers-incomplets");
}
