import { http, HttpResponse } from "msw";
import type { CorpsCorrectionPaiement, CorpsEnregistrementPaiement, Paiement } from "@/api/paiements";

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

export const handlersPaiements = [
  http.get("/api/v1/paiements", ({ request }) => {
    const url = new URL(request.url);
    const adherentId = url.searchParams.get("adherentId");
    const statut = url.searchParams.get("statut");
    const modePaiement = url.searchParams.get("modePaiement");

    let contenu = PAIEMENTS_TEST;
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
    const existant = CLES_IDEMPOTENCE_VUES.get(cleIdempotence);
    if (existant) return HttpResponse.json(existant, { status: 200 });

    const corps = (await request.json()) as CorpsEnregistrementPaiement;

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
      statut: "A_CONTROLER",
      validePar: null,
      creePar: "agent.test",
      confirmeParChefId: null,
      confirmeLe: null,
      motifIncoherence: null,
      version: 0,
    };
    PAIEMENTS_TEST = [...PAIEMENTS_TEST, nouveau];
    CLES_IDEMPOTENCE_VUES.set(cleIdempotence, nouveau);
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
    if (!corps.motif) {
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
