/**
 * COSITI — Dossier adhérent, comptes et historiques (backend V22).
 *
 * Routes : `GET /adherents/{id}/dossier-complet` (`ADHERENT:LIRE`), `GET /adherents/{id}/synthese-cotisations`
 * (`PAIEMENT:LIRE`), `GET /adherents/{id}/historique-general` (`ADHERENT:LIRE`) et `/historique-financier`
 * (`PAIEMENT:LIRE` ou `FRAIS_ADHESION:LIRE`, sinon 403 `HISTORIQUE_FINANCIER_INACCESSIBLE`).
 *
 * **Aucun calcul ici.** Soldes Sécurité sociale / Épargne, cumuls, reste avant seuil et progression viennent du
 * serveur ; les historiques sont filtrés et paginés par lui. Les événements internes DGA / DAF / CNPS sont déjà
 * retirés par le serveur selon le rôle du lecteur.
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";
import type { ChampManquant, CoordonneesAdherent, StatutAdherent } from "@/api/adherents";
import type { TypeDocument } from "@/api/documents";

export interface CompteCotisation {
  /** Code du compte : `SECURITE_SOCIALE` ou `EPARGNE`. */
  readonly compte: string;
  readonly soldeValide: number;
  readonly montantEnAttente: number;
  readonly nombreOperationsValidees: number;
  readonly derniereOperationLe: string | null;
}

/** `SyntheseCotisationsAdherentDto` — source de vérité des comptes et cumuls. */
export interface SyntheseCotisations {
  readonly adherentId: string;
  readonly matricule: string;
  readonly packId: string | null;
  readonly packCode: string | null;
  readonly packLibelle: string | null;
  readonly packRequisALaProchaineCotisation: boolean;
  readonly compteSecuriteSociale: CompteCotisation;
  readonly compteEpargne: CompteCotisation;
  /** Affectations validées antérieures à la répartition confirmée (« Coopérative »). */
  readonly montantAutresComposantes: number;
  readonly totalCotisations: number;
  readonly montantValide: number;
  readonly nombreCotisationsValidees: number;
  readonly montantEnAttente: number;
  readonly nombreCotisationsEnAttente: number;
  readonly montantEnAttenteNonReparti: number;
  readonly montantBrouillons: number;
  readonly nombreBrouillons: number;
  readonly nombreCotisationsRejetees: number;
  readonly nombreCotisationsAnnulees: number;
  readonly seuilEligibiliteCnps: number | null;
  readonly cumulImpute: number;
  readonly resteAvantSeuil: number | null;
  /** Pourcentage 0–100, calculé par le serveur ; `null` sans pack. */
  readonly tauxProgression: number | null;
  readonly eligibleCnps: boolean;
  readonly derniereCotisationValideeLe: string | null;
  readonly calculeLe: string;
  readonly avertissements: readonly string[];
}

/** `DossierCompletAdherentDto` (V22). `cotisations` est `null` sans `PAIEMENT:LIRE`. */
export interface DossierCompletAdherent {
  readonly id: string;
  readonly matricule: string;
  readonly identite: {
    readonly nom: string;
    readonly prenoms: string | null;
    readonly dateNaissance: string | null;
    readonly sexe: string | null;
    readonly numeroCni: string | null;
    readonly numeroCnps: string | null;
  };
  readonly professionnel: {
    readonly activiteId: string | null;
    readonly activiteLibelle: string | null;
    readonly associationId: string | null;
    readonly associationNom: string | null;
    readonly numeroCnps: string | null;
  };
  readonly coordonnees: CoordonneesAdherent;
  readonly etatDossier: {
    readonly statut: StatutAdherent;
    readonly statutValidation: string | null;
    readonly statutControleDga: string | null;
    readonly inscriptionPayee: boolean;
    readonly archive: boolean;
    readonly dateAdhesion: string | null;
    readonly activeLe: string | null;
    readonly zoneId: string | null;
    readonly zoneLibelle: string | null;
    readonly completionPourcentage: number;
    readonly champsManquants: readonly ChampManquant[];
    readonly documentsManquants: readonly TypeDocument[];
  };
  readonly cotisations: SyntheseCotisations | null;
  /** Nombres d'événements visibles ; `-1` pour un historique fermé à ce lecteur. */
  readonly historique: {
    readonly nombreEvenementsGeneraux: number;
    readonly nombreEvenementsFinanciers: number;
    readonly routeGeneral: string;
    readonly routeFinancier: string;
  };
  readonly version: number | null;
  readonly avertissements: readonly string[];
}

export function obtenirDossierComplet(id: string) {
  return client.get<DossierCompletAdherent>(`/adherents/${id}/dossier-complet`);
}

export function obtenirSyntheseCotisations(id: string) {
  return client.get<SyntheseCotisations>(`/adherents/${id}/synthese-cotisations`);
}

/* ----- Historiques ----- */

export type CategorieHistorique = "GENERAL" | "FINANCIER";
export type PeriodeHistorique = "JOUR" | "SEMAINE" | "MOIS" | "ANNEE";

export interface ModificationChamp {
  readonly champ: string;
  /** Valeur brute ; `"***"` quand `masque` (donnée personnelle sensible). */
  readonly avant: unknown;
  readonly apres: unknown;
  readonly masque: boolean;
}

/** `EvenementHistoriqueDto` — lecture seule. */
export interface EvenementHistorique {
  readonly id: string;
  readonly adherentId: string;
  readonly horodatage: string;
  readonly acteur: string | null;
  /** Rôles **actuels** de l'auteur (le journal n'enregistre pas le rôle tenu au moment de l'action). */
  readonly acteurRoles: readonly string[];
  readonly typeEvenement: string;
  readonly categorie: CategorieHistorique;
  readonly module: string | null;
  readonly action: string | null;
  readonly resultat: string | null;
  readonly referenceMetier: string | null;
  readonly objet: string | null;
  readonly objetId: string | null;
  readonly motif: string | null;
  readonly details: Readonly<Record<string, unknown>> | null;
  readonly modifications: readonly ModificationChamp[] | null;
  readonly correlationId: string | null;
}

export interface FiltresHistorique {
  /** Avec `date` de référence (aujourd'hui côté serveur si absente). */
  periode?: PeriodeHistorique;
  date?: string;
  /** Période personnalisée, bornes incluses — exclusive de `periode`. */
  du?: string;
  au?: string;
  page?: number;
  taille?: number;
  direction?: "ASC" | "DESC";
}

function parametres(filtres: FiltresHistorique): string {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    requete.set(cle, String(valeur));
  }
  const texte = requete.toString();
  return texte ? `?${texte}` : "";
}

export function listerHistorique(id: string, categorie: CategorieHistorique, filtres: FiltresHistorique) {
  const chemin = categorie === "GENERAL" ? "historique-general" : "historique-financier";
  return client.get<EnveloppeListe<EvenementHistorique>>(`/adherents/${id}/${chemin}${parametres(filtres)}`);
}
