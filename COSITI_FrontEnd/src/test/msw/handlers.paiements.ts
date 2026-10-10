import { http, HttpResponse } from "msw";
import type { CorpsCorrectionPaiement, CorpsEnregistrementPaiement, CorpsVerificationDoublonPaiement, Paiement } from "@/api/paiements";
import type { RapprochementCaisse } from "@/api/bilansCaisse";

export let PAIEMENTS_TEST: Paiement[] = [
  {
    id: "pai-1",
    adherentId: "adh-1",
    numeroRecu: "REC-000001",
    datePaiement: "2026-09-01",
    montant: 5000,
    modePaiement: "ESPECES",
    referenceTransaction: null,
    typePaiement: "COTISATION",
    agentEncaisseurId: "agent-1",
    statut: "A_CONTROLER",
    validePar: null,
    creePar: "agent.test",
    confirmeParChefId: null,
    confirmeLe: null,
    motifIncoherence: null,
    version: 0,
  },
  {
    id: "pai-2",
    adherentId: "adh-2",
    numeroRecu: "REC-000002",
    datePaiement: "2026-09-05",
    montant: 7000,
    modePaiement: "ORANGE_MONEY",
    referenceTransaction: null,
    typePaiement: "COTISATION",
    agentEncaisseurId: "agent-1",
    statut: "A_CONTROLER",
    validePar: null,
    creePar: "daf.test",
    confirmeParChefId: null,
    confirmeLe: null,
    motifIncoherence: null,
    version: 0,
  },
];

const CLES_IDEMPOTENCE_VUES = new Map<string, Paiement>();
/** V22 : empreinte de la requête par clé — même clé + autre requête → 409 `IDEMPOTENCY_KEY_CONFLIT`. */
const EMPREINTES_IDEMPOTENCE = new Map<string, string>();

/** Matricules du jeu adhérents (`handlers.adherents.ts`), pour le filtre `adherentMatricule` (#3). */
const MATRICULES: Readonly<Record<string, string>> = { "adh-1": "COSITI-00001", "adh-2": "COSITI-00002" };

/** Brouillon saisi par l'Agent (#14), et paiement rejeté (#17). */
PAIEMENTS_TEST = [
  ...PAIEMENTS_TEST,
  {
    id: "pai-3",
    adherentId: "adh-1",
    numeroRecu: "REC-000003",
    datePaiement: "2026-09-10",
    montant: 2100,
    modePaiement: "MTN_MOMO",
    referenceTransaction: "MP260910.1432",
    typePaiement: "COTISATION",
    agentEncaisseurId: "agent-1",
    statut: "BROUILLON",
    validePar: null,
    creePar: "agent.test",
    confirmeParChefId: null,
    confirmeLe: null,
    motifIncoherence: null,
    version: 0,
  },
  {
    id: "pai-4",
    adherentId: "adh-2",
    numeroRecu: "REC-000004",
    datePaiement: "2026-09-11",
    montant: 700,
    modePaiement: "ESPECES",
    referenceTransaction: null,
    typePaiement: "COTISATION",
    agentEncaisseurId: null,
    statut: "REJETE",
    validePar: null,
    creePar: "gestionnaire.test",
    confirmeParChefId: null,
    confirmeLe: null,
    motifIncoherence: null,
    motifRejet: "Reçu papier illisible, montant non vérifiable.",
    rejeteLe: "2026-09-12T08:30:00Z",
    version: 1,
  },
];

function introuvable() {
  return HttpResponse.json({ code: "PAIEMENT_INTROUVABLE", message: "Paiement introuvable.", traceId: "t", avertissements: [] }, { status: 404 });
}

function remplacer(misAJour: Paiement) {
  PAIEMENTS_TEST = PAIEMENTS_TEST.map((p) => (p.id === misAJour.id ? misAJour : p));
  return HttpResponse.json(misAJour);
}

/** Bilans de caisse par date (#30 à #33) : le 2026-09-28 est saisi par le Gestionnaire, en attente du DAF. */
export let BILANS_TEST: Record<string, RapprochementCaisse> = {
  "2026-09-28": {
    id: "bil-1",
    date: "2026-09-28",
    montantNumerique: 12000,
    montantPhysique: 11500,
    ecart: -500,
    nombrePaiements: 3,
    statut: "SAISI",
    commentaire: null,
    saisiPar: "u-gc-1",
    creePar: "gestionnaire.test",
    creeLe: "2026-09-28T18:00:00Z",
    validePar: null,
    valideLe: null,
    commentaireValidation: null,
    motifAnomalie: null,
    signalePar: null,
    signaleLe: null,
    montantNumeriqueActuel: 12000,
    numeriqueModifieDepuisSaisie: false,
    version: 0,
  },
};

function erreurApi(code: string, message: string, statut: number) {
  return HttpResponse.json({ code, message, traceId: "t", avertissements: [] }, { status: statut });
}


export const handlersPaiements = [
  http.get("/api/v1/paiements", ({ request }) => {
    const url = new URL(request.url);
    const adherentId = url.searchParams.get("adherentId");
    const statut = url.searchParams.get("statut");
    const modePaiement = url.searchParams.get("modePaiement");
    const matricule = url.searchParams.get("adherentMatricule");
    const agentId = url.searchParams.get("agentId");
    const reference = url.searchParams.get("reference");
    const tri = url.searchParams.get("tri");
    const dateDu = url.searchParams.get("dateDu");
    const dateAu = url.searchParams.get("dateAu");
    // Liste blanche réelle du tri et contrôle de période de `ControleurPaiement` : un simulacre permissif
    // laisserait passer une requête que le serveur refuse.
    if (tri && !["DATE_PAIEMENT", "MONTANT", "NUMERO_RECU", "STATUT", "DATE_SAISIE"].includes(tri)) {
      return erreurApi("PAIEMENT_TRI_INVALIDE", `Champ de tri inconnu : ${tri}.`, 400);
    }
    if (dateDu && dateAu && dateDu > dateAu) {
      return erreurApi("PAIEMENT_PERIODE_INVALIDE", "La date de début doit précéder la date de fin.", 400);
    }

    let contenu = PAIEMENTS_TEST;
    if (matricule) contenu = contenu.filter((p) => MATRICULES[p.adherentId] === matricule);
    if (agentId) contenu = contenu.filter((p) => p.agentEncaisseurId === agentId);
    if (reference) contenu = contenu.filter((p) => p.numeroRecu === reference || p.referenceTransaction === reference);
    if (dateDu) contenu = contenu.filter((p) => p.datePaiement >= dateDu);
    if (dateAu) contenu = contenu.filter((p) => p.datePaiement <= dateAu);
    if (adherentId) contenu = contenu.filter((p) => p.adherentId === adherentId);
    if (statut) contenu = contenu.filter((p) => p.statut === statut);
    if (modePaiement) contenu = contenu.filter((p) => p.modePaiement === modePaiement);

    return HttpResponse.json({
      contenu,
      page: 0,
      taille: 25,
      totalElements: contenu.length,
      totalPages: 1,
      avertissements: [],
    });
  }),

  http.get("/api/v1/paiements/statistiques/quotidiennes", ({ request }) => {
    const date = new URL(request.url).searchParams.get("date") ?? "2026-09-30";
    const vide = date === "2026-01-01";
    return HttpResponse.json({
      date,
      nombreTotal: vide ? 0 : 5,
      montantTotal: vide ? 0 : 19800,
      parStatut: vide ? {} : { A_CONTROLER: { nombre: 2, montant: 12000 }, VALIDE: { nombre: 3, montant: 7800 } },
      parMode: vide ? {} : { ESPECES: { nombre: 4, montant: 12800 }, ORANGE_MONEY: { nombre: 1, montant: 7000 } },
    });
  }),

  // Déclaré avant `/paiements/:id`, qui capturerait sinon ce chemin à un segment.
  http.get("/api/v1/paiements/bilan-journalier", ({ request }) => {
    const date = new URL(request.url).searchParams.get("date") ?? "2026-09-30";
    return HttpResponse.json({
      date,
      nombrePaiements: 4,
      montantTotalEnregistre: 19000,
      montantNumerique: 12000,
      nombrePaiementsNumerique: 3,
      parMode: { ESPECES: { nombre: 3, montant: 12000 }, ORANGE_MONEY: { nombre: 1, montant: 7000 } },
      modesNumerique: ["ESPECES"],
      statutsInclus: ["A_CONTROLER", "VALIDE", "RAPPROCHE", "INCOHERENCE"],
      rapprochement: BILANS_TEST[date] ?? null,
      avertissements: ["La définition du montant numérique (BILAN_CAISSE_MODES_NUMERIQUE) n'est pas validée par la COSITI."],
    });
  }),

  http.post("/api/v1/paiements/verifier-doublon", async ({ request }) => {
    const corps = (await request.json()) as CorpsVerificationDoublonPaiement;
    const referenceDejaUtilisee =
      !!corps.referenceTransaction &&
      PAIEMENTS_TEST.some((p) => p.modePaiement === corps.modePaiement && p.referenceTransaction === corps.referenceTransaction);
    const doublonsPotentiels = PAIEMENTS_TEST.filter(
      (p) =>
        p.adherentId === corps.adherentId &&
        p.datePaiement === corps.datePaiement &&
        p.montant === corps.montant &&
        p.modePaiement === corps.modePaiement &&
        !["ANNULE", "REJETE"].includes(p.statut),
    );
    return HttpResponse.json({ referenceDejaUtilisee, doublonsPotentiels, doublonDetecte: referenceDejaUtilisee || doublonsPotentiels.length > 0 });
  }),

  http.get("/api/v1/paiements/:id/historique-statuts", ({ params }) => {
    const paiement = PAIEMENTS_TEST.find((p) => p.id === params.id);
    if (!paiement) return introuvable();
    return HttpResponse.json([
      {
        horodatage: "2026-09-01T09:00:00Z",
        typeOperation: "PAIEMENT_CREATION",
        statutAvant: null,
        statutApres: "A_CONTROLER",
        acteur: paiement.creePar,
        motif: null,
      },
    ]);
  }),

  http.post("/api/v1/paiements/:id/soumettre", ({ params }) => {
    const paiement = PAIEMENTS_TEST.find((p) => p.id === params.id);
    if (!paiement) return introuvable();
    if (paiement.statut !== "BROUILLON") {
      return erreurApi("PAIEMENT_TRANSITION_INTERDITE", "Seul un brouillon peut être soumis à validation.", 409);
    }
    return remplacer({ ...paiement, statut: "A_CONTROLER" });
  }),

  http.post("/api/v1/paiements/:id/rejeter", async ({ params, request }) => {
    const corps = (await request.json()) as { motif?: string };
    if (!corps.motif) return erreurApi("PAIEMENT_MOTIF_REQUIS", "Le motif du rejet est obligatoire.", 400);
    const paiement = PAIEMENTS_TEST.find((p) => p.id === params.id);
    if (!paiement) return introuvable();
    return remplacer({ ...paiement, statut: "REJETE", motifRejet: corps.motif, rejeteLe: new Date().toISOString() });
  }),

  http.get("/api/v1/bilans-caisse", () => {
    const contenu = Object.values(BILANS_TEST);
    return HttpResponse.json({ contenu, page: 0, taille: 10, totalElements: contenu.length, totalPages: 1, avertissements: [] });
  }),

  http.get("/api/v1/bilans-caisse/:date", ({ params }) => {
    const bilan = BILANS_TEST[String(params.date)];
    return bilan ? HttpResponse.json(bilan) : erreurApi("BILAN_CAISSE_INTROUVABLE", "Aucun bilan pour cette date.", 404);
  }),

  http.post("/api/v1/bilans-caisse", async ({ request }) => {
    const corps = (await request.json()) as { date: string; montantPhysique: number; commentaire?: string };
    const existant = BILANS_TEST[corps.date];
    if (existant && existant.statut !== "ANOMALIE") {
      return erreurApi("BILAN_CAISSE_DEJA_SAISI", "Un bilan est déjà saisi pour cette date.", 409);
    }
    const cree: RapprochementCaisse = {
      id: `bil-${corps.date}`,
      date: corps.date,
      montantNumerique: 12000,
      montantPhysique: corps.montantPhysique,
      ecart: corps.montantPhysique - 12000,
      nombrePaiements: 3,
      statut: "SAISI",
      commentaire: corps.commentaire ?? null,
      saisiPar: "u-gc-1",
      creePar: "gestionnaire.test",
      creeLe: new Date().toISOString(),
      validePar: null,
      valideLe: null,
      commentaireValidation: null,
      motifAnomalie: null,
      signalePar: null,
      signaleLe: null,
      montantNumeriqueActuel: 12000,
      numeriqueModifieDepuisSaisie: false,
      version: 0,
    };
    BILANS_TEST = { ...BILANS_TEST, [corps.date]: cree };
    return HttpResponse.json(cree, { status: 201 });
  }),

  http.post("/api/v1/bilans-caisse/:date/valider", ({ params }) => {
    const bilan = BILANS_TEST[String(params.date)];
    if (!bilan) return erreurApi("BILAN_CAISSE_INTROUVABLE", "Aucun bilan pour cette date.", 404);
    const valide: RapprochementCaisse = { ...bilan, statut: "VALIDE", valideLe: new Date().toISOString(), validePar: "u-daf-1" };
    BILANS_TEST = { ...BILANS_TEST, [bilan.date]: valide };
    return HttpResponse.json(valide);
  }),

  http.post("/api/v1/bilans-caisse/:date/anomalie", async ({ params, request }) => {
    const corps = (await request.json()) as { motif?: string };
    if (!corps.motif) return erreurApi("BILAN_CAISSE_MOTIF_REQUIS", "Le motif de l'anomalie est obligatoire.", 400);
    const bilan = BILANS_TEST[String(params.date)];
    if (!bilan) return erreurApi("BILAN_CAISSE_INTROUVABLE", "Aucun bilan pour cette date.", 404);
    const signale: RapprochementCaisse = { ...bilan, statut: "ANOMALIE", motifAnomalie: corps.motif };
    BILANS_TEST = { ...BILANS_TEST, [bilan.date]: signale };
    return HttpResponse.json(signale);
  }),

  http.get("/api/v1/paiements/:id", ({ params }) => {
    const paiement = PAIEMENTS_TEST.find((p) => p.id === params.id);
    if (!paiement) {
      return HttpResponse.json(
        { code: "PAIEMENT_INTROUVABLE", message: "Paiement introuvable.", traceId: "t", avertissements: [] },
        { status: 404 },
      );
    }
    return HttpResponse.json(paiement);
  }),

  http.post("/api/v1/paiements", async ({ request }) => {
    const cleIdempotence = request.headers.get("Idempotency-Key");
    if (!cleIdempotence) {
      return HttpResponse.json(
        { code: "IDEMPOTENCY_KEY_MANQUANTE", message: "L'en-tête Idempotency-Key est obligatoire.", traceId: "t", avertissements: [] },
        { status: 400 },
      );
    }
    const texte = await request.text();
    const existant = CLES_IDEMPOTENCE_VUES.get(cleIdempotence);
    if (existant) {
      if (EMPREINTES_IDEMPOTENCE.get(cleIdempotence) !== texte) {
        return erreurApi("IDEMPOTENCY_KEY_CONFLIT", "Cette clé d'idempotence a déjà servi pour une autre cotisation.", 409);
      }
      return HttpResponse.json(existant, { status: 200 });
    }

    const corps = JSON.parse(texte) as CorpsEnregistrementPaiement;
    // V22 : règle de répartition (minimums 700 / 300, total = somme) et pack à la première cotisation.
    if (corps.montantSecuriteSociale !== undefined && corps.montantSecuriteSociale < 700) {
      return HttpResponse.json(
        { code: "COTISATION_REPARTITION_INVALIDE", message: "Le montant affecté à la Sécurité Sociale doit être au minimum de 700 FCFA.", champ: "montantSecuriteSociale", traceId: "t", avertissements: [] },
        { status: 400 },
      );
    }
    if (
      corps.montantSecuriteSociale !== undefined &&
      corps.montantEpargne !== undefined &&
      corps.montantSecuriteSociale + corps.montantEpargne !== corps.montant
    ) {
      return HttpResponse.json(
        { code: "COTISATION_REPARTITION_INVALIDE", message: "La répartition doit correspondre au montant total de la cotisation.", champ: "montantEpargne", traceId: "t", avertissements: [] },
        { status: 400 },
      );
    }
    if (corps.adherentId === "adh-2" && !corps.packId) {
      return HttpResponse.json(
        { code: "COTISATION_PACK_REQUIS", message: "Choisissez le pack de cet adhérent pour sa première cotisation.", champ: "packId", traceId: "t", avertissements: [] },
        { status: 400 },
      );
    }
    const brouillon = new URL(request.url).searchParams.get("brouillon") === "true";

    if (["ORANGE_MONEY", "MTN_MOMO"].includes(corps.modePaiement) && !corps.referenceTransaction) {
      return HttpResponse.json(
        {
          code: "PAIEMENT_REFERENCE_MANQUANTE",
          message: "La référence de transaction est obligatoire pour un paiement Orange Money ou MTN MoMo.",
          champ: "referenceTransaction",
          traceId: "t",
          avertissements: [],
        },
        { status: 400 },
      );
    }

    const nouveau: Paiement = {
      id: `pai-${PAIEMENTS_TEST.length + 1}`,
      adherentId: corps.adherentId,
      numeroRecu: `REC-00000${PAIEMENTS_TEST.length + 1}`,
      datePaiement: corps.datePaiement,
      montant: corps.montant,
      modePaiement: corps.modePaiement,
      referenceTransaction: corps.referenceTransaction ?? null,
      typePaiement: corps.typePaiement,
      agentEncaisseurId: corps.agentEncaisseurId ?? null,
      statut: brouillon ? "BROUILLON" : "A_CONTROLER",
      validePar: null,
      creePar: "agent.test",
      confirmeParChefId: null,
      confirmeLe: null,
      motifIncoherence: null,
      montantSecuriteSociale: corps.montantSecuriteSociale ?? null,
      montantEpargne: corps.montantEpargne ?? null,
      origineRepartition: corps.montantSecuriteSociale !== undefined ? "SAISIE" : "PROPOSITION_SERVEUR",
      packId: corps.packId ?? null,
      version: 0,
    };
    PAIEMENTS_TEST = [...PAIEMENTS_TEST, nouveau];
    CLES_IDEMPOTENCE_VUES.set(cleIdempotence, nouveau);
    EMPREINTES_IDEMPOTENCE.set(cleIdempotence, texte);
    return HttpResponse.json(nouveau, { status: 201 });
  }),

  http.post("/api/v1/paiements/:id/valider", ({ params }) => {
    const paiement = PAIEMENTS_TEST.find((p) => p.id === params.id);
    if (!paiement) {
      return HttpResponse.json({ code: "PAIEMENT_INTROUVABLE", message: "Paiement introuvable.", traceId: "t", avertissements: [] }, { status: 404 });
    }
    const misAJour: Paiement = { ...paiement, statut: "VALIDE" };
    PAIEMENTS_TEST = PAIEMENTS_TEST.map((p) => (p.id === misAJour.id ? misAJour : p));
    return HttpResponse.json(misAJour);
  }),

  http.post("/api/v1/paiements/:id/corriger", async ({ params, request }) => {
    const corps = (await request.json()) as CorpsCorrectionPaiement;
    const cible = PAIEMENTS_TEST.find((p) => p.id === params.id);
    // Workflow V19 : seule un brouillon se corrige directement ; sinon, demande de correction validée par le DAF.
    if (cible && cible.statut !== "BROUILLON") {
      return erreurApi("PAIEMENT_CORRECTION_PAR_DEMANDE", "Cette cotisation est soumise : sa correction passe par une demande.", 409);
    }
    if (!corps.motif && cible?.statut !== "BROUILLON") {
      return HttpResponse.json(
        { code: "PAIEMENT_MOTIF_REQUIS", message: "Le motif de la correction est obligatoire.", traceId: "t", avertissements: [] },
        { status: 400 },
      );
    }
    const paiement = PAIEMENTS_TEST.find((p) => p.id === params.id);
    if (!paiement) {
      return HttpResponse.json({ code: "PAIEMENT_INTROUVABLE", message: "Paiement introuvable.", traceId: "t", avertissements: [] }, { status: 404 });
    }
    const misAJour: Paiement = {
      ...paiement,
      montant: corps.montant ?? paiement.montant,
      datePaiement: corps.datePaiement ?? paiement.datePaiement,
      referenceTransaction: corps.referenceTransaction ?? paiement.referenceTransaction,
    };
    PAIEMENTS_TEST = PAIEMENTS_TEST.map((p) => (p.id === misAJour.id ? misAJour : p));
    return HttpResponse.json(misAJour);
  }),

  http.post("/api/v1/paiements/:id/annuler", async ({ params, request }) => {
    const corps = (await request.json()) as { motif: string };
    if (!corps.motif) {
      return HttpResponse.json(
        { code: "PAIEMENT_MOTIF_REQUIS", message: "Le motif de l'annulation est obligatoire.", traceId: "t", avertissements: [] },
        { status: 400 },
      );
    }
    const paiement = PAIEMENTS_TEST.find((p) => p.id === params.id);
    if (paiement) {
      const misAJour: Paiement = { ...paiement, statut: "ANNULE" };
      PAIEMENTS_TEST = PAIEMENTS_TEST.map((p) => (p.id === misAJour.id ? misAJour : p));
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Chemin et permission confirmés à l'identique par le code backend réel
  // livré en parallèle de ce lot (`ControleurPaiement.signalerIncoherence`,
  // `V8__permissions_j5_j6.sql`) — voir `api/paiements.ts`.
  http.post("/api/v1/paiements/:id/signaler-incoherence", async ({ params, request }) => {
    const corps = (await request.json()) as { motif: string };
    if (!corps.motif) {
      return HttpResponse.json(
        { code: "PAIEMENT_MOTIF_REQUIS", message: "Le motif de l'incohérence est obligatoire.", traceId: "t", avertissements: [] },
        { status: 400 },
      );
    }
    const paiement = PAIEMENTS_TEST.find((p) => p.id === params.id);
    if (!paiement) {
      return HttpResponse.json({ code: "PAIEMENT_INTROUVABLE", message: "Paiement introuvable.", traceId: "t", avertissements: [] }, { status: 404 });
    }
    const misAJour: Paiement = { ...paiement, statut: "INCOHERENCE", motifIncoherence: corps.motif };
    PAIEMENTS_TEST = PAIEMENTS_TEST.map((p) => (p.id === misAJour.id ? misAJour : p));
    return HttpResponse.json(misAJour);
  }),

  // UC-CHEF-10 (`ControleurPaiement.confirmerChef`) : motif facultatif, ne
  // change jamais `statut`.
  http.post("/api/v1/paiements/:id/confirmer-chef", async ({ params }) => {
    const paiement = PAIEMENTS_TEST.find((p) => p.id === params.id);
    if (!paiement) {
      return HttpResponse.json({ code: "PAIEMENT_INTROUVABLE", message: "Paiement introuvable.", traceId: "t", avertissements: [] }, { status: 404 });
    }
    if (paiement.confirmeParChefId) {
      return HttpResponse.json(
        { code: "PAIEMENT_DEJA_CONFIRME_CHEF", message: "Ce paiement a déjà été confirmé par un Chef.", traceId: "t", avertissements: [] },
        { status: 409 },
      );
    }
    const misAJour: Paiement = { ...paiement, confirmeParChefId: "u-chef-1", confirmeLe: new Date().toISOString() };
    PAIEMENTS_TEST = PAIEMENTS_TEST.map((p) => (p.id === misAJour.id ? misAJour : p));
    return HttpResponse.json(misAJour);
  }),
];
