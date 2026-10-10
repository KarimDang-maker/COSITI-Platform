import { http, HttpResponse } from "msw";
import type { RecuPaiement } from "@/api/paiements";
import type { RemiseCaisse } from "@/api/remisesCaisse";
import type { AdherentResume, Zone } from "@/api/organisation";
import { PAIEMENTS_TEST } from "@/test/msw/handlers.paiements";

/**
 * Simulacre des routes complétées par la recette des 3 modules (05/10/2026) : reçu de cotisation, changement de pack,
 * création / modification de zone, adhérents sans agent sans filtre de zone (V23), remises de caisse.
 */

export const REMISES_TEST: RemiseCaisse[] = [
  {
    id: "rem-1",
    agentId: "agent-1",
    montantDeclare: 6500,
    montantRecu: null,
    ecart: null,
    statut: "DECLAREE",
    dateRemise: "2026-10-05",
    recuLe: null,
    creeLe: "2026-10-05T09:00:00Z",
    nombrePaiements: 2,
  },
];

/** Adhérent créé depuis le formulaire allégé V23 : aucune zone. */
export const SANS_AGENT_SANS_ZONE: AdherentResume = {
  id: "adh-9",
  matricule: "COSITI-00009",
  nomComplet: "MBIDA Rose",
  telephonePrincipal: "677000009",
  zoneId: null,
  statut: "PREINSCRIT",
} as AdherentResume;

export const handlersComplements = [
  http.get("/api/v1/paiements/:id/recu", ({ params }) => {
    const p = PAIEMENTS_TEST.find((x) => x.id === params.id);
    if (!p) return HttpResponse.json({ code: "PAIEMENT_INTROUVABLE", message: "Paiement introuvable." }, { status: 404 });
    const recu: RecuPaiement = {
      paiementId: p.id,
      numeroRecu: p.numeroRecu,
      adherentId: p.adherentId,
      montant: p.montant,
      datePaiement: p.datePaiement,
      modePaiement: p.modePaiement,
      statut: p.statut,
      adherentMatricule: "COSITI-00001",
      adherentNom: "NDONGO Marie Claire",
      montantSecuriteSociale: 700,
      montantEpargne: p.montant - 700,
      referenceTransaction: p.referenceTransaction ?? null,
      typePaiement: "COTISATION",
      enregistrePar: "agent.test",
      enregistreLe: "2026-10-05T08:00:00Z",
      editeLe: "2026-10-05T10:00:00Z",
    };
    return HttpResponse.json(recu);
  }),

  http.post("/api/v1/adherents/:id/pack", async ({ params, request }) => {
    const corps = (await request.json()) as { packId: string; effetLe: string };
    return HttpResponse.json({ id: "adhesion-2", adherentId: params.id, packId: corps.packId, dateDebut: corps.effetLe, dateFin: null });
  }),

  http.post("/api/v1/zones", async ({ request }) => {
    const corps = (await request.json()) as Omit<Zone, "id" | "active">;
    if (corps.code === "Z01") {
      return HttpResponse.json({ code: "ZONE_CODE_DEJA_UTILISE", message: "Ce code de zone est déjà utilisé." }, { status: 409 });
    }
    return HttpResponse.json({ id: "zone-9", active: true, ...corps, zoneParenteId: corps.zoneParenteId ?? null }, { status: 201 });
  }),

  http.put("/api/v1/zones/:id", async ({ params, request }) => {
    const corps = (await request.json()) as Omit<Zone, "id" | "active">;
    return HttpResponse.json({ id: params.id, active: true, ...corps, zoneParenteId: corps.zoneParenteId ?? null });
  }),

  // V23 : sans `zoneId`, tous les adhérents sans agent, y compris ceux créés sans zone.
  http.get("/api/v1/portefeuilles/sans-agent", ({ request }) => {
    const zoneId = new URL(request.url).searchParams.get("zoneId");
    if (zoneId) return undefined; // laisse la main au simulacre historique (filtré par zone)
    return HttpResponse.json([SANS_AGENT_SANS_ZONE]);
  }),

  http.get("/api/v1/remises-caisse/a-remettre", ({ request }) => {
    const agentId = new URL(request.url).searchParams.get("agentId");
    return HttpResponse.json([
      { ...PAIEMENTS_TEST[0]!, id: "pai-r1", numeroRecu: "REC-000101", montant: 1500, modePaiement: "ESPECES", agentEncaisseurId: agentId },
      { ...PAIEMENTS_TEST[0]!, id: "pai-r2", numeroRecu: "REC-000102", montant: 2000, modePaiement: "ESPECES", agentEncaisseurId: agentId },
      { ...PAIEMENTS_TEST[0]!, id: "pai-r3", numeroRecu: "REC-000103", montant: 1000, modePaiement: "MTN_MOMO", agentEncaisseurId: agentId },
    ]);
  }),

  http.post("/api/v1/remises-caisse", async ({ request }) => {
    const corps = (await request.json()) as { agentId: string; paiementIds: string[] };
    return HttpResponse.json(
      { ...REMISES_TEST[0]!, id: "rem-9", agentId: corps.agentId, nombrePaiements: corps.paiementIds.length },
      { status: 201 },
    );
  }),

  http.get("/api/v1/remises-caisse", ({ request }) => {
    const statut = new URL(request.url).searchParams.get("statut");
    const contenu = REMISES_TEST.filter((r) => !statut || r.statut === statut);
    return HttpResponse.json({ contenu, page: 0, taille: 10, totalElements: contenu.length, totalPages: 1, avertissements: [] });
  }),

  http.post("/api/v1/remises-caisse/:id/receptionner", async ({ params, request }) => {
    const { montantRecu } = (await request.json()) as { montantRecu: number };
    const remise = REMISES_TEST.find((r) => r.id === params.id)!;
    const ecart = montantRecu - remise.montantDeclare;
    return HttpResponse.json({ ...remise, montantRecu, ecart, statut: ecart === 0 ? "CLOTUREE" : "EN_ECART" });
  }),
];
