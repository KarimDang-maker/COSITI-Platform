import { http, HttpResponse } from "msw";
import type { ContexteCotisation } from "@/api/paiements";
import type { DossierCompletAdherent, EvenementHistorique, SyntheseCotisations } from "@/api/dossierAdherent";
import type { Utilisateur } from "@/auth/types";
import { UTILISATEURS } from "@/test/msw/donnees";
import { ADHERENTS_TEST, PACKS_TEST } from "@/test/msw/handlers.adherents";

/**
 * Simulacre des routes V22 : contexte de saisie par matricule, comptes et cumuls, dossier complet, historiques
 * général et financier (filtre période, pagination, refus 403 du financier sans `PAIEMENT:LIRE` / `FRAIS_ADHESION:LIRE`).
 * `adh-1` a un pack (adhésion ouverte) ; `adh-2` n'en a pas encore (`packRequis`).
 */

function utilisateurDe(request: Request): Utilisateur | undefined {
  const jeton = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/, "");
  return UTILISATEURS[jeton];
}

function erreur(code: string, message: string, statut: number) {
  return HttpResponse.json({ code, message, traceId: "t-v22", avertissements: [] }, { status: statut });
}

function exiger(request: Request, ...permissions: string[]): Utilisateur | Response {
  const u = utilisateurDe(request);
  if (!u) return erreur("AUTHENTIFICATION_REQUISE", "Authentification requise.", 401);
  if (!permissions.some((p) => u.permissions.includes(p))) return erreur("ACCES_REFUSE", "Accès refusé.", 403);
  return u;
}

function compte(code: string, solde: number, attente: number) {
  return { compte: code, soldeValide: solde, montantEnAttente: attente, nombreOperationsValidees: solde > 0 ? 1 : 0, derniereOperationLe: solde > 0 ? "2026-09-30" : null };
}

export function synthese(adherentId: string): SyntheseCotisations {
  const avecPack = adherentId === "adh-1";
  return {
    adherentId,
    matricule: adherentId === "adh-1" ? "COSITI-00001" : "COSITI-00002",
    packId: avecPack ? PACKS_TEST[0]!.id : null,
    packCode: avecPack ? PACKS_TEST[0]!.code : null,
    packLibelle: avecPack ? PACKS_TEST[0]!.libelle : null,
    packRequisALaProchaineCotisation: !avecPack,
    compteSecuriteSociale: compte("SECURITE_SOCIALE", avecPack ? 2100 : 0, avecPack ? 700 : 0),
    compteEpargne: compte("EPARGNE", avecPack ? 900 : 0, avecPack ? 300 : 0),
    montantAutresComposantes: 0,
    totalCotisations: avecPack ? 4000 : 0,
    montantValide: avecPack ? 3000 : 0,
    nombreCotisationsValidees: avecPack ? 3 : 0,
    montantEnAttente: avecPack ? 1000 : 0,
    nombreCotisationsEnAttente: avecPack ? 1 : 0,
    montantEnAttenteNonReparti: 0,
    montantBrouillons: 0,
    nombreBrouillons: 0,
    nombreCotisationsRejetees: 0,
    nombreCotisationsAnnulees: 0,
    seuilEligibiliteCnps: avecPack ? 10500 : null,
    cumulImpute: avecPack ? 3000 : 0,
    resteAvantSeuil: avecPack ? 7500 : null,
    tauxProgression: avecPack ? 28.57 : null,
    eligibleCnps: false,
    derniereCotisationValideeLe: avecPack ? "2026-09-30" : null,
    calculeLe: "2026-10-04T08:00:00Z",
    avertissements: [],
  };
}

function evenement(partiel: Partial<EvenementHistorique> & Pick<EvenementHistorique, "id" | "action" | "categorie">): EvenementHistorique {
  return {
    adherentId: "adh-1",
    horodatage: "2026-10-01T09:00:00Z",
    acteur: "gestionnaire.test",
    acteurRoles: ["GESTIONNAIRE_COMPTE"],
    typeEvenement: "ADHERENT_MODIFICATION",
    module: "DOSSIER",
    resultat: "SUCCES",
    referenceMetier: null,
    objet: "adherent",
    objetId: "adh-1",
    motif: null,
    details: null,
    modifications: null,
    correlationId: null,
    ...partiel,
  };
}

const GENERAL: readonly EvenementHistorique[] = [
  evenement({ id: "hg-1", categorie: "GENERAL", action: "Création du dossier", typeEvenement: "ADHERENT_CREATION", referenceMetier: "COSITI-00001", horodatage: "2026-09-01T08:00:00Z" }),
  evenement({
    id: "hg-2",
    categorie: "GENERAL",
    action: "Modification des coordonnées",
    typeEvenement: "ADHERENT_MODIFICATION_CONTACT",
    modifications: [
      { champ: "ville", avant: "Douala", apres: "Yaoundé", masque: false },
      { champ: "telephonePrincipal", avant: "***", apres: "***", masque: true },
    ],
  }),
  ...Array.from({ length: 24 }, (_, i) =>
    evenement({ id: `hg-x${i}`, categorie: "GENERAL", action: "Ajout d'un document", typeEvenement: "DOCUMENT_TELEVERSEMENT", horodatage: "2026-08-01T08:00:00Z" }),
  ),
];

const FINANCIER: readonly EvenementHistorique[] = [
  evenement({
    id: "hf-1",
    categorie: "FINANCIER",
    action: "Enregistrement d'une cotisation",
    typeEvenement: "PAIEMENT_CREATION",
    referenceMetier: "REC-000010",
    details: { montant: 1000, montantSecuriteSociale: 700, montantEpargne: 300, statut: "A_CONTROLER" },
  }),
  evenement({ id: "hf-2", categorie: "FINANCIER", action: "Frais d'adhésion enregistré", typeEvenement: "FRAIS_ADHESION_ENREGISTREMENT", referenceMetier: "FAD-000001", details: { montantRecu: 1000 } }),
];

/** Les pages sont découpées comme le ferait le serveur ; `periode=JOUR` ne renvoie rien (cas « vide »). */
function page(liste: readonly EvenementHistorique[], url: URL) {
  const periode = url.searchParams.get("periode");
  const direction = url.searchParams.get("direction") ?? "DESC";
  const numero = Number(url.searchParams.get("page") ?? "0");
  const taille = Number(url.searchParams.get("taille") ?? "25");
  const filtree = periode === "JOUR" ? [] : direction === "ASC" ? [...liste].reverse() : liste;
  const contenu = filtree.slice(numero * taille, numero * taille + taille);
  return {
    contenu,
    page: numero,
    taille,
    totalElements: filtree.length,
    totalPages: Math.ceil(filtree.length / taille),
    avertissements: [],
  };
}

export const handlersV22 = [
  http.get("/api/v1/paiements/contexte-adherent", ({ request }) => {
    const refus = exiger(request, "PAIEMENT:CREER");
    if (refus instanceof Response) return refus;
    const saisie = new URL(request.url).searchParams.get("matricule") ?? "";
    const chiffres = saisie.replace(/\D/g, "");
    if (!chiffres) return erreur("ADHERENT_MATRICULE_INVALIDE", "Le matricule saisi n'est pas valide (ex. COSITI-00001).", 400);
    const matricule = `COSITI-${chiffres.padStart(5, "0")}`;
    const adherent = ADHERENTS_TEST.find((a) => a.matricule === matricule);
    if (!adherent) return erreur("ADHERENT_INTROUVABLE", "Aucun adhérent ne porte ce matricule.", 404);
    const avecPack = adherent.id === "adh-1";
    const contexte: ContexteCotisation = {
      adherentId: adherent.id,
      matricule: adherent.matricule,
      nom: adherent.nom,
      prenoms: adherent.prenoms,
      telephonePrincipal: adherent.telephonePrincipal,
      zoneLibelle: adherent.zoneLibelle,
      statut: adherent.statut,
      statutValidation: adherent.statutValidation ?? null,
      packId: avecPack ? PACKS_TEST[0]!.id : null,
      packCode: avecPack ? PACKS_TEST[0]!.code : null,
      packLibelle: avecPack ? PACKS_TEST[0]!.libelle : null,
      packRequis: !avecPack,
      minimumSecuriteSociale: 700,
      minimumEpargne: 300,
      epargneFacultative: true,
      cotisable: true,
      motifsBlocage: [],
      avertissements: [],
    };
    return HttpResponse.json(contexte);
  }),

  http.get("/api/v1/adherents/:id/synthese-cotisations", ({ request, params }) => {
    const refus = exiger(request, "PAIEMENT:LIRE");
    return refus instanceof Response ? refus : HttpResponse.json(synthese(String(params.id)));
  }),

  http.get("/api/v1/adherents/:id/dossier-complet", ({ request, params }) => {
    const u = exiger(request, "ADHERENT:LIRE");
    if (u instanceof Response) return u;
    const a = ADHERENTS_TEST.find((x) => x.id === params.id);
    if (!a) return erreur("ADHERENT_INTROUVABLE", "Adhérent introuvable.", 404);
    const dossier: DossierCompletAdherent = {
      id: a.id,
      matricule: a.matricule,
      identite: { nom: a.nom, prenoms: a.prenoms, dateNaissance: a.dateNaissance, sexe: a.sexe, numeroCni: a.numeroCni, numeroCnps: a.numeroCnps },
      professionnel: { activiteId: a.activiteId, activiteLibelle: null, associationId: null, associationNom: null, numeroCnps: a.numeroCnps },
      coordonnees: {
        adherentId: a.id,
        telephonePrincipal: a.telephonePrincipal,
        telephoneSecondaire: a.telephoneSecondaire,
        whatsapp: a.whatsapp ?? null,
        email: a.email ?? null,
        numeroCni: a.numeroCni,
        localisation: a.localisation,
        quartier: a.quartier,
        ville: a.ville,
        latitude: null,
        longitude: null,
      },
      etatDossier: {
        statut: a.statut,
        statutValidation: a.statutValidation ?? null,
        statutControleDga: null,
        inscriptionPayee: a.inscriptionPayee,
        archive: false,
        dateAdhesion: a.dateAdhesion,
        activeLe: null,
        zoneId: a.zoneId,
        zoneLibelle: a.zoneLibelle,
        completionPourcentage: 60,
        champsManquants: [],
        documentsManquants: [],
      },
      cotisations: u.permissions.includes("PAIEMENT:LIRE") ? synthese(a.id) : null,
      historique: {
        nombreEvenementsGeneraux: GENERAL.length,
        nombreEvenementsFinanciers: FINANCIER.length,
        routeGeneral: `/api/v1/adherents/${a.id}/historique-general`,
        routeFinancier: `/api/v1/adherents/${a.id}/historique-financier`,
      },
      version: a.version ?? null,
      avertissements: [],
    };
    return HttpResponse.json(dossier);
  }),

  http.get("/api/v1/adherents/:id/historique-general", ({ request }) => {
    const refus = exiger(request, "ADHERENT:LIRE");
    return refus instanceof Response ? refus : HttpResponse.json(page(GENERAL, new URL(request.url)));
  }),

  http.get("/api/v1/adherents/:id/historique-financier", ({ request }) => {
    const u = utilisateurDe(request);
    if (!u) return erreur("AUTHENTIFICATION_REQUISE", "Authentification requise.", 401);
    if (!u.permissions.includes("PAIEMENT:LIRE") && !u.permissions.includes("FRAIS_ADHESION:LIRE")) {
      return erreur("HISTORIQUE_FINANCIER_INACCESSIBLE", "Vous n'avez pas accès à l'historique financier.", 403);
    }
    return HttpResponse.json(page(FINANCIER, new URL(request.url)));
  }),
];
