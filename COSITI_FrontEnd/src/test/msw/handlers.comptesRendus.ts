import { http, HttpResponse } from "msw";
import type { CompteRendu } from "@/api/comptesRendus";
import type { CampagneRelance, Relance } from "@/api/relances";
import type { Notification } from "@/api/notifications";

/**
 * Gestionnaires MSW pour les domaines `comptes-rendus`, `relances` et
 * `notifications` (J8). Forme alignée sur le code backend réel livré dans le
 * même lot (`cm.cositi.api.compterendu`, `cm.cositi.api.relance`,
 * `cm.cositi.api.notification`).
 */

/** Identifiant de l'agent de test — voir `UTILISATEURS[JETON_AGENT].id` dans `donnees.ts`. */
const ID_AGENT = "u-agent-1";

const BROUILLON_AGENT: CompteRendu = {
  id: "cr-brouillon",
  type: "TERRAIN",
  statut: "BROUILLON",
  auteurUtilisateurId: ID_AGENT,
  destinataireUtilisateurId: null,
  agentId: "ag-1",
  zoneId: "zone-1",
  periodeDebut: "2026-09-08",
  periodeFin: "2026-09-14",
  nbVisites: 12,
  nbAdherentsRencontres: 9,
  nbAdherentsCrees: 2,
  nbPaiementsEnregistres: 5,
  montantCollecte: 35000,
  synthese: "Tournée du marché central",
  difficultes: "Deux adhérents injoignables",
  observationControle: null,
  controleLe: null,
  controlePar: null,
  transmisLe: null,
  sourceIds: [],
  creeLe: "2026-09-15T08:00:00Z",
  creePar: "agent.test",
};

const TRANSMIS_A_CONTROLER: CompteRendu = {
  ...BROUILLON_AGENT,
  id: "cr-transmis",
  statut: "TRANSMIS",
  transmisLe: "2026-09-15T09:00:00Z",
  synthese: "Semaine chargée",
};

const CONTROLE_A_CONSOLIDER: CompteRendu = {
  ...BROUILLON_AGENT,
  id: "cr-controle",
  statut: "CONTROLE",
  transmisLe: "2026-09-15T09:00:00Z",
  controleLe: "2026-09-16T10:00:00Z",
  controlePar: "gestionnaire.test",
  observationControle: "Chiffres cohérents",
};

const CONSOLIDE: CompteRendu = {
  id: "cr-consolide",
  type: "CONSOLIDE",
  statut: "BROUILLON",
  auteurUtilisateurId: "u-gc-1",
  destinataireUtilisateurId: null,
  agentId: null,
  zoneId: null,
  periodeDebut: "2026-09-01",
  periodeFin: "2026-09-14",
  nbVisites: 27,
  nbAdherentsRencontres: 22,
  nbAdherentsCrees: 5,
  nbPaiementsEnregistres: 12,
  montantCollecte: 78000,
  synthese: "Quinzaine conforme aux objectifs",
  difficultes: "Deux adhérents injoignables\n---\nRoute coupée",
  observationControle: null,
  controleLe: null,
  controlePar: null,
  transmisLe: null,
  sourceIds: ["cr-controle", "cr-transmis"],
  creeLe: "2026-09-16T12:00:00Z",
  creePar: "gestionnaire.test",
};

export const COMPTES_RENDUS_TEST = {
  BROUILLON_AGENT,
  TRANSMIS_A_CONTROLER,
  CONTROLE_A_CONSOLIDER,
  CONSOLIDE,
};

const TOUS = [BROUILLON_AGENT, TRANSMIS_A_CONTROLER, CONTROLE_A_CONSOLIDER, CONSOLIDE];

function enveloppe<T>(contenu: readonly T[]) {
  return {
    contenu,
    page: 0,
    taille: 25,
    totalElements: contenu.length,
    totalPages: 1,
    avertissements: [],
  };
}

const CAMPAGNES_TEST: readonly CampagneRelance[] = [
  {
    id: "camp-1",
    libelle: "Retards de septembre",
    critereJson: '{"joursRetardMin":"30"}',
    dateDebut: "2026-09-01",
    dateFin: null,
    statut: "ACTIVE",
    nbRelances: 4,
    creeLe: "2026-09-01T08:00:00Z",
    creePar: "gestionnaire.test",
  },
  {
    id: "camp-2",
    libelle: "Campagne d'août",
    critereJson: "{}",
    dateDebut: "2026-08-01",
    dateFin: "2026-08-31",
    statut: "CLOTUREE",
    nbRelances: 11,
    creeLe: "2026-08-01T08:00:00Z",
    creePar: "gestionnaire.test",
  },
];

const RELANCES_TEST: readonly Relance[] = [
  {
    id: "rel-1",
    adherentId: "adh-2",
    campagneId: "camp-1",
    responsableUtilisateurId: ID_AGENT,
    canal: "APPEL",
    dateContact: "2026-09-10T09:30:00Z",
    resultat: "PROMESSE",
    prochaineActionLe: "2026-09-20",
    commentaire: "Promet de payer après la vente",
  },
  {
    id: "rel-2",
    adherentId: "adh-3",
    campagneId: "camp-1",
    responsableUtilisateurId: ID_AGENT,
    canal: "VISITE",
    dateContact: "2026-09-11T14:00:00Z",
    resultat: "DEMENAGE",
    prochaineActionLe: null,
    commentaire: "A quitté le quartier",
  },
];

const NOTIFICATIONS_TEST: readonly Notification[] = [
  {
    id: "notif-1",
    type: "COMPTE_RENDU_TERRAIN",
    titre: "Compte rendu terrain reçu",
    corps: "Période du 2026-09-08 au 2026-09-14, transmis par agent.test.",
    entite: "compte_rendu",
    entiteId: "cr-transmis",
    lue: false,
    creeLe: "2026-09-15T09:00:00Z",
  },
  {
    id: "notif-2",
    type: "REMISE_CAISSE_ECART",
    titre: "Écart sur une remise de caisse",
    corps: "La remise de caisse présente un écart de 2 500 FCFA.",
    entite: "remise_caisse",
    entiteId: "rem-1",
    lue: true,
    creeLe: "2026-09-14T17:00:00Z",
  },
];

export const handlersComptesRendus = [
  http.get("/api/v1/comptes-rendus", ({ request }) => {
    const parametres = new URL(request.url).searchParams;
    const type = parametres.get("type");
    const statut = parametres.get("statut");
    const contenu = TOUS.filter(
      (c) => (!type || c.type === type) && (!statut || c.statut === statut),
    );
    return HttpResponse.json(enveloppe(contenu));
  }),

  http.get("/api/v1/comptes-rendus/:id", ({ params }) => {
    const compteRendu = TOUS.find((c) => c.id === params.id);
    if (!compteRendu) {
      return HttpResponse.json(
        { code: "COMPTE_RENDU_INTROUVABLE", message: "Compte rendu introuvable.", traceId: "t-cr-404" },
        { status: 404 },
      );
    }
    return HttpResponse.json(compteRendu);
  }),

  http.post("/api/v1/comptes-rendus", async ({ request }) => {
    const corps = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...BROUILLON_AGENT, id: "cr-nouveau", ...corps }, { status: 201 });
  }),

  http.post("/api/v1/comptes-rendus/:id/transmettre", ({ params }) => {
    const compteRendu = TOUS.find((c) => c.id === params.id) ?? BROUILLON_AGENT;
    return HttpResponse.json({
      ...compteRendu,
      statut: "TRANSMIS",
      transmisLe: "2026-09-16T08:00:00Z",
    });
  }),

  http.post("/api/v1/comptes-rendus/:id/controler", ({ params }) =>
    HttpResponse.json({
      ...(TOUS.find((c) => c.id === params.id) ?? TRANSMIS_A_CONTROLER),
      statut: "CONTROLE",
      controleLe: "2026-09-16T10:00:00Z",
      controlePar: "gestionnaire.test",
      observationControle: "Chiffres cohérents",
    }),
  ),

  http.post("/api/v1/comptes-rendus/consolider", () => HttpResponse.json(CONSOLIDE, { status: 201 })),

  // ------------------------------------------------------------- Relances

  http.get("/api/v1/campagnes-relance", () => HttpResponse.json(enveloppe(CAMPAGNES_TEST))),

  http.post("/api/v1/campagnes-relance", async ({ request }) => {
    const corps = (await request.json()) as { libelle: string; critere: Record<string, unknown> };
    return HttpResponse.json(
      {
        id: "camp-nouvelle",
        libelle: corps.libelle,
        critereJson: JSON.stringify(corps.critere ?? {}),
        dateDebut: "2026-09-23",
        dateFin: null,
        statut: "ACTIVE",
        nbRelances: 0,
        creeLe: "2026-09-23T08:00:00Z",
        creePar: "gestionnaire.test",
      },
      { status: 201 },
    );
  }),

  http.post("/api/v1/campagnes-relance/:id/statut", ({ params, request }) => {
    const statut = new URL(request.url).searchParams.get("statut") ?? "CLOTUREE";
    const campagne = CAMPAGNES_TEST.find((c) => c.id === params.id) ?? CAMPAGNES_TEST[0]!;
    return HttpResponse.json({ ...campagne, statut });
  }),

  http.get("/api/v1/relances", ({ request }) => {
    const campagneId = new URL(request.url).searchParams.get("campagneId");
    const contenu = campagneId ? RELANCES_TEST.filter((r) => r.campagneId === campagneId) : RELANCES_TEST;
    return HttpResponse.json(enveloppe(contenu));
  }),

  http.get("/api/v1/adherents/:id/relances", () => HttpResponse.json(RELANCES_TEST)),

  http.post("/api/v1/relances", async ({ request }) => {
    const corps = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...RELANCES_TEST[0], id: "rel-nouvelle", ...corps }, { status: 201 });
  }),

  // -------------------------------------------------------- Notifications

  http.get("/api/v1/notifications/non-lues/compte", () =>
    HttpResponse.json({ nonLues: NOTIFICATIONS_TEST.filter((n) => !n.lue).length }),
  ),

  http.get("/api/v1/notifications", ({ request }) => {
    const seulementNonLues = new URL(request.url).searchParams.get("seulementNonLues") === "true";
    const contenu = seulementNonLues ? NOTIFICATIONS_TEST.filter((n) => !n.lue) : NOTIFICATIONS_TEST;
    return HttpResponse.json(enveloppe(contenu));
  }),

  http.post("/api/v1/notifications/:id/lue", ({ params }) =>
    HttpResponse.json({
      ...(NOTIFICATIONS_TEST.find((n) => n.id === params.id) ?? NOTIFICATIONS_TEST[0]!),
      lue: true,
    }),
  ),
];
