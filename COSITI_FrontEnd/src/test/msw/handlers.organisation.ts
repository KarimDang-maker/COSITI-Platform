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
  {
    id: "agent-3",
    codeAgent: "AG-00003",
    nomComplet: "Fouda Luc",
    telephone: "677000003",
    zoneId: "zone-2",
    utilisateurId: "u-agent-3",
    chefAgentId: null,
    objectifCollecteMensuel: null,
    actif: false,
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

/** Portefeuille de l'agent-1 (forme paginée de `GET /agents/{id}/portefeuille`). */
const PORTEFEUILLE_TEST: readonly AdherentResume[] = [
  { id: "adh-1", matricule: "COSITI-00001", nomComplet: "NDONGO Marie Claire", telephonePrincipal: "677000937", zoneId: "zone-1", zoneLibelle: "Douala - Bonabéri", dateAdhesion: "2025-01-10", statut: "ACTIF" },
  { id: "adh-2", matricule: "COSITI-00002", nomComplet: "ATANGANA Paul", telephonePrincipal: "690112233", zoneId: "zone-1", zoneLibelle: "Douala - Bonabéri", dateAdhesion: "2025-03-02", statut: "EN_RETARD" },
];

function enveloppe<T>(contenu: readonly T[]) {
  return { contenu, page: 0, taille: 25, totalElements: contenu.length, totalPages: contenu.length > 0 ? 1 : 0, avertissements: [] };
}

function agentIntrouvable() {
  return HttpResponse.json({ code: "AGENT_INTROUVABLE", message: "Agent introuvable.", traceId: "t", avertissements: [] }, { status: 404 });
}

export const handlersOrganisation = [
  http.get("/api/v1/zones", () => HttpResponse.json(ZONES_TEST)),

  // Depuis le module agents de terrain : enveloppe paginée, filtres `recherche`/`actif`/`zoneId`, et liste
  // blanche du tri identique à `ControleurAgent` (un tri inconnu est refusé en 400, comme en réel).
  http.get("/api/v1/agents", ({ request }) => {
    const url = new URL(request.url);
    const recherche = url.searchParams.get("recherche")?.toLowerCase();
    const actif = url.searchParams.get("actif");
    const zoneId = url.searchParams.get("zoneId");
    const tri = url.searchParams.get("tri");
    if (tri && !["NOM", "CODE_AGENT", "ZONE"].includes(tri)) {
      return HttpResponse.json(
        { code: "AGENT_TRI_INVALIDE", message: `Champ de tri inconnu : ${tri}.`, champ: "tri", traceId: "t-tri", avertissements: [] },
        { status: 400 },
      );
    }
    let contenu = AGENTS_TEST;
    if (recherche) {
      contenu = contenu.filter(
        (a) => a.nomComplet.toLowerCase().includes(recherche) || a.codeAgent.toLowerCase().includes(recherche) || a.telephone.includes(recherche),
      );
    }
    if (actif !== null) contenu = contenu.filter((a) => String(a.actif) === actif);
    if (zoneId) contenu = contenu.filter((a) => a.zoneId === zoneId);
    return HttpResponse.json(enveloppe(contenu));
  }),

  http.get("/api/v1/agents/portefeuille-distribution", () =>
    HttpResponse.json(
      AGENTS_TEST.filter((a) => a.actif).map((a) => ({
        agentId: a.id,
        codeAgent: a.codeAgent,
        nomComplet: a.nomComplet,
        nombreAdherents: a.id === "agent-1" ? 42 : 18,
      })),
    ),
  ),

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

  http.get("/api/v1/agents/:id/portefeuille", () => HttpResponse.json(enveloppe(PORTEFEUILLE_TEST))),

  http.get("/api/v1/agents/:id/portefeuille/resume", () =>
    HttpResponse.json({ totalAdherents: 2, dossiersComplets: 1, dossiersIncomplets: 1 }),
  ),

  http.get("/api/v1/agents/:id/portefeuille/historique", () =>
    HttpResponse.json([
      { adherentId: "adh-1", dateDebut: "2025-01-10", dateFin: null, motif: "Première affectation" },
      { adherentId: "adh-inconnu", dateDebut: "2024-06-01", dateFin: "2025-01-09", motif: "Changement de secteur" },
    ]),
  ),

  http.get("/api/v1/agents/:id/portefeuille/cnps/proches-seuil", () =>
    HttpResponse.json([
      { adherentId: "adh-2", matricule: "COSITI-00002", nomComplet: "ATANGANA Paul", packCode: "PACK_700", cumulCotise: 9000, seuilEligibilite: 10500, dossierOuvert: false },
    ]),
  ),

  http.get("/api/v1/agents/:id/portefeuille/cnps/eligibles", () => HttpResponse.json([])),

  http.get("/api/v1/agents/:id/cotisations-resume", ({ params, request }) => {
    const periode = new URL(request.url).searchParams.get("periode") ?? "2026-09";
    return HttpResponse.json({
      agentId: params.id,
      periode,
      nombrePaiements: periode === "2026-08" ? 3 : 12,
      montantValide: periode === "2026-08" ? 4200 : 168000,
      montantEnAttente: 14000,
      montantAnnule: 700,
    });
  }),

  http.get("/api/v1/agents/:id/operations", ({ params }) =>
    HttpResponse.json([
      {
        id: "op-2",
        horodatage: "2026-09-20T10:15:00Z",
        utilisateurId: "u-dga-1",
        utilisateurIdentifiant: "dga.test",
        typeOperation: "AGENT_MODIFICATION",
        entite: "agent",
        entiteId: params.id,
        motif: null,
        resultat: "SUCCES",
      },
      {
        id: "op-1",
        horodatage: "2026-01-05T09:00:00Z",
        utilisateurId: "u-dga-1",
        utilisateurIdentifiant: "dga.test",
        typeOperation: "AGENT_CREATION_PAR_DGA",
        entite: "agent",
        entiteId: params.id,
        motif: "Créé par la DGA dga.test",
        resultat: "SUCCES",
      },
    ]),
  ),

  http.put("/api/v1/agents/:id", async ({ params, request }) => {
    const agent = AGENTS_TEST.find((a) => a.id === params.id);
    if (!agent) return agentIntrouvable();
    const corps = (await request.json()) as Partial<Agent>;
    return HttpResponse.json({ ...agent, ...corps });
  }),

  http.post("/api/v1/agents/:id/statut", async ({ params, request }) => {
    const agent = AGENTS_TEST.find((a) => a.id === params.id);
    if (!agent) return agentIntrouvable();
    const corps = (await request.json()) as { actif: boolean; motif: string };
    if (!corps.motif) {
      return HttpResponse.json(
        { code: "AGENT_MOTIF_REQUIS", message: "Le motif du changement de statut est obligatoire.", traceId: "t", avertissements: [] },
        { status: 400 },
      );
    }
    if (corps.actif === agent.actif) {
      return HttpResponse.json(
        { code: "AGENT_STATUT_INCHANGE", message: "L'agent a déjà ce statut.", traceId: "t", avertissements: [] },
        { status: 409 },
      );
    }
    return HttpResponse.json({ ...agent, actif: corps.actif });
  }),

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
  http.post("/api/v1/portefeuilles/retirer", () => new HttpResponse(null, { status: 204 })),

  // Déclaré en dernier : `/agents/:id` capturerait sinon `/agents/chef` et `/agents/portefeuille-distribution`.
  http.get("/api/v1/agents/:id", ({ params }) => {
    const agent = AGENTS_TEST.find((a) => a.id === params.id);
    return agent ? HttpResponse.json(agent) : agentIntrouvable();
  }),
];
