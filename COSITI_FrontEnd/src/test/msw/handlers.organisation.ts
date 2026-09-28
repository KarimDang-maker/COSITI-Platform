import { http, HttpResponse } from "msw";
import type { Agent, AdherentResume, HistoriqueDesignationChef, Zone } from "@/api/organisation";

export const ZONES_TEST: readonly Zone[] = [
  { id: "zone-1", code: "Z01", libelle: "Douala - Bonabéri", ville: "Douala", region: "Littoral", zoneParenteId: null, active: true },
  { id: "zone-2", code: "Z02", libelle: "Yaoundé - Mfoundi", ville: "Yaoundé", region: "Centre", zoneParenteId: null, active: true },
];

export let AGENTS_TEST: Agent[] = [
  {
    id: "agent-1",
    codeAgent: "AG-00001",
    nomComplet: "Ateba Jean",
    telephone: "677000001",
    zoneId: "zone-1",
    utilisateurId: "u-agent-1",
    chefAgentId: null,
    objectifCollecteMensuel: 500000,
    actif: true,
  },
  {
    id: "agent-2",
    codeAgent: "AG-00002",
    nomComplet: "Mengue Sophie",
    telephone: "677000002",
    zoneId: "zone-1",
    utilisateurId: "u-agent-2",
    chefAgentId: "agent-1",
    objectifCollecteMensuel: 400000,
    actif: true,
  },
];

const HISTORIQUE_CHEF: HistoriqueDesignationChef[] = [
  {
    id: "hist-1",
    zoneId: "zone-1",
    agentId: "agent-1",
    agentRemplaceId: null,
    designePar: "u-dga-1",
    motif: "Ouverture de la zone",
    horodatage: "2026-01-05T09:00:00Z",
  },
];

const SANS_AGENT_TEST: readonly AdherentResume[] = [
  { id: "adh-3", matricule: "COSITI-00003", nomComplet: "OWONA Serge", telephonePrincipal: "699000003", zoneId: "zone-1", statut: "PREINSCRIT" },
];

export const handlersOrganisation = [
  http.get("/api/v1/zones", () => HttpResponse.json(ZONES_TEST)),

  http.get("/api/v1/agents", () => HttpResponse.json(AGENTS_TEST)),

  http.get("/api/v1/agents/:id/charge", ({ params, request }) => {
    const url = new URL(request.url);
    const periode = url.searchParams.get("periode") ?? "2026-09";
    const agent = AGENTS_TEST.find((a) => a.id === params.id);
    return HttpResponse.json({
      agentId: params.id,
      periode,
      nombreAdherents: agent?.id === "agent-1" ? 42 : 18,
      montantCollecte: agent?.id === "agent-1" ? 210000 : 90000,
      objectifCollecteMensuel: agent?.objectifCollecteMensuel ?? null,
    });
  }),

  http.get("/api/v1/agents/chef", ({ request }) => {
    const url = new URL(request.url);
    const zoneId = url.searchParams.get("zoneId");
    const dernier = [...HISTORIQUE_CHEF].reverse().find((h) => h.zoneId === zoneId);
    if (!dernier) {
      return HttpResponse.json(
        { code: "ORGANISATION_AUCUN_CHEF", message: "Aucun Chef n'est désigné pour cette zone.", traceId: "t-chef", avertissements: [] },
        { status: 404 },
      );
    }
    const agent = AGENTS_TEST.find((a) => a.id === dernier.agentId);
    return HttpResponse.json(agent);
  }),

  http.get("/api/v1/agents/:id/historique-chef", ({ params }) => {
    const agent = AGENTS_TEST.find((a) => a.id === params.id);
    return HttpResponse.json(HISTORIQUE_CHEF.filter((h) => h.zoneId === agent?.zoneId));
  }),

  http.get("/api/v1/agents/:id/portefeuille", () => HttpResponse.json(SANS_AGENT_TEST)),

  http.get("/api/v1/portefeuilles/sans-agent", () => HttpResponse.json(SANS_AGENT_TEST)),

  http.post("/api/v1/agents", async ({ request }) => {
    const corps = (await request.json()) as {
      identifiantConnexion: string;
      nomComplet: string;
      telephone: string;
      zoneId: string;
      objectifCollecteMensuel?: number;
    };
    const nouvel: Agent = {
      id: `agent-${AGENTS_TEST.length + 1}`,
      codeAgent: `AG-0000${AGENTS_TEST.length + 1}`,
      nomComplet: corps.nomComplet,
      telephone: corps.telephone,
      zoneId: corps.zoneId,
      utilisateurId: `u-agent-${AGENTS_TEST.length + 1}`,
      chefAgentId: null,
      objectifCollecteMensuel: corps.objectifCollecteMensuel ?? null,
      actif: true,
      motDePasseInitial: "Xk4#mQ9pLr2@Wz7T",
    };
    AGENTS_TEST = [...AGENTS_TEST, nouvel];
    return HttpResponse.json(nouvel, { status: 201 });
  }),

  http.post("/api/v1/agents/:id/designer-chef", async ({ params, request }) => {
    const corps = (await request.json()) as { motif: string };
    if (!corps.motif) {
      return HttpResponse.json(
        { code: "ORGANISATION_MOTIF_REQUIS", message: "Le motif de désignation est obligatoire.", traceId: "t", avertissements: [] },
        { status: 400 },
      );
    }
    const agent = AGENTS_TEST.find((a) => a.id === params.id);
    if (!agent) {
      return HttpResponse.json({ code: "AGENT_INTROUVABLE", message: "Agent introuvable.", traceId: "t", avertissements: [] }, { status: 404 });
    }
    if (HISTORIQUE_CHEF.some((h) => h.zoneId === agent.zoneId)) {
      return HttpResponse.json(
        {
          code: "ORGANISATION_CHEF_DEJA_DESIGNE",
          message: "Un Chef existe déjà pour cette zone — utilisez le remplacement.",
          traceId: "t",
          avertissements: [],
        },
        { status: 409 },
      );
    }
    HISTORIQUE_CHEF.push({
      id: `hist-${HISTORIQUE_CHEF.length + 1}`,
      zoneId: agent.zoneId!,
      agentId: agent.id,
      agentRemplaceId: null,
      designePar: "u-dga-1",
      motif: corps.motif,
      horodatage: new Date().toISOString(),
    });
    return HttpResponse.json(agent);
  }),

  http.post("/api/v1/agents/:id/remplacer-chef", async ({ params, request }) => {
    const corps = (await request.json()) as { motif: string };
    const agent = AGENTS_TEST.find((a) => a.id === params.id);
    if (!agent) {
      return HttpResponse.json({ code: "AGENT_INTROUVABLE", message: "Agent introuvable.", traceId: "t", avertissements: [] }, { status: 404 });
    }
    const dernier = [...HISTORIQUE_CHEF].reverse().find((h) => h.zoneId === agent.zoneId);
    if (!dernier) {
      return HttpResponse.json(
        { code: "ORGANISATION_AUCUN_CHEF", message: "Aucun Chef actuel pour cette zone.", traceId: "t", avertissements: [] },
        { status: 404 },
      );
    }
    HISTORIQUE_CHEF.push({
      id: `hist-${HISTORIQUE_CHEF.length + 1}`,
      zoneId: agent.zoneId!,
      agentId: agent.id,
      agentRemplaceId: dernier.agentId,
      designePar: "u-dga-1",
      motif: corps.motif,
      horodatage: new Date().toISOString(),
    });
    return HttpResponse.json(agent);
  }),

  http.post("/api/v1/portefeuilles/affecter", () => new HttpResponse(null, { status: 204 })),
  http.post("/api/v1/portefeuilles/transferer", () => new HttpResponse(null, { status: 204 })),
];
