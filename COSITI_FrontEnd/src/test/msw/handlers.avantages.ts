import { http, HttpResponse } from "msw";
import type {
  Avantage,
  AvantageAdherent,
  Beneficiaire,
  CorpsAvantage,
  ResultatRecalcul,
  StatutAvantage,
} from "@/api/avantages";

/**
 * Gestionnaires MSW du module avantages : formes alignées sur `AvantageDto`, `AvantageAdherentDto`,
 * `BeneficiaireDto` et `ResultatRecalculDto` (backend `cm.cositi.api.avantage`). Comme le serveur, les bénéficiaires
 * sont `ACQUIS` quand aucun statut n'est demandé ; les refus métier sont surchargés via `serveur.use(...)`.
 */

export const AVANTAGES_TEST: readonly Avantage[] = [
  {
    id: "av-1",
    code: "PF_ALLOCATIONS_FAMILIALES",
    libelle: "Allocations familiales",
    branche: "PRESTATIONS_FAMILIALES",
    description: "Allocations pour les enfants à charge.",
    actif: true,
    statutValidation: "V",
    criteres: [
      { type: "IMMATRICULE", valeur: null, libelle: "Immatriculé à la CNPS" },
      { type: "ENFANT_AGE_MAX", valeur: "21", libelle: "Un enfant de 21 ans ou moins" },
    ],
    pieces: [{ categorie: "CONSTITUTION", libelle: "Demande sur imprimé CNPS" }],
    nbAcquis: 1,
    nbEnCours: 1,
    nbSuspendus: 0,
  },
  {
    id: "av-2",
    code: "PENSION_VIEILLESSE",
    libelle: "Pension de vieillesse",
    branche: "PENSIONS",
    description: null,
    actif: true,
    statutValidation: "C",
    criteres: [{ type: "AGE_MIN", valeur: "60", libelle: "Âge de 60 ans minimum" }],
    pieces: [],
    nbAcquis: 0,
    nbEnCours: 0,
    nbSuspendus: 1,
  },
];

export const BENEFICIAIRES_TEST: Readonly<Record<string, readonly Beneficiaire[]>> = {
  "av-1": [
    { adherentId: "adh-1", matricule: "COSITI-00001", nomComplet: "MBARGA Alice", zoneId: "zone-1", statut: "ACQUIS", criteresManquants: [], dateDebut: "2026-08-01" },
    { adherentId: "adh-2", matricule: "COSITI-00002", nomComplet: "OWONA Serge", zoneId: "zone-2", statut: "EN_COURS", criteresManquants: ["Immatriculé à la CNPS"], dateDebut: null },
  ],
  "av-2": [
    { adherentId: "adh-3", matricule: "COSITI-00003", nomComplet: "NKODO Pierre", zoneId: "zone-1", statut: "SUSPENDU", criteresManquants: ["Âge de 60 ans minimum"], dateDebut: "2025-01-01" },
  ],
};

export const AVANTAGES_ADHERENT_TEST: readonly AvantageAdherent[] = [
  {
    avantageId: "av-1",
    code: "PF_ALLOCATIONS_FAMILIALES",
    libelle: "Allocations familiales",
    branche: "PRESTATIONS_FAMILIALES",
    statut: "EN_COURS",
    statutValidation: "V",
    criteresSatisfaits: ["Un enfant de 21 ans ou moins"],
    criteresManquants: ["Immatriculé à la CNPS"],
    dateDebut: null,
    dateFin: null,
    pieces: [],
  },
];

export const RESULTAT_RECALCUL_TEST: ResultatRecalcul = { adherentsEvalues: 172, avantagesEvalues: 4, changements: 3 };

export const handlersAvantages = [
  http.get("/api/v1/avantages", ({ request }) => {
    const inclure = new URL(request.url).searchParams.get("inclureInactifs") === "true";
    return HttpResponse.json(AVANTAGES_TEST.filter((a) => a.actif || inclure));
  }),

  http.get("/api/v1/avantages/:id/beneficiaires", ({ params, request }) => {
    const url = new URL(request.url);
    const statut = (url.searchParams.get("statut") ?? "ACQUIS") as StatutAvantage;
    const zoneId = url.searchParams.get("zoneId");
    const liste = (BENEFICIAIRES_TEST[String(params.id)] ?? []).filter(
      (b) => b.statut === statut && (!zoneId || b.zoneId === zoneId),
    );
    return HttpResponse.json(liste);
  }),

  http.get("/api/v1/avantages/:id", ({ params }) => {
    const avantage = AVANTAGES_TEST.find((a) => a.id === params.id);
    return avantage
      ? HttpResponse.json(avantage)
      : HttpResponse.json({ code: "AVANTAGE_INTROUVABLE", message: "Avantage introuvable.", traceId: "t-404" }, { status: 404 });
  }),

  http.post("/api/v1/avantages/recalculer", () => HttpResponse.json(RESULTAT_RECALCUL_TEST)),

  http.post("/api/v1/avantages", async ({ request }) => {
    const corps = (await request.json()) as CorpsAvantage;
    return HttpResponse.json(
      { ...AVANTAGES_TEST[0], ...corps, id: "av-nouveau", statutValidation: "V", nbAcquis: 0, nbEnCours: 0, nbSuspendus: 0 },
      { status: 201 },
    );
  }),

  http.put("/api/v1/avantages/:id", async ({ params, request }) => {
    const corps = (await request.json()) as CorpsAvantage;
    return HttpResponse.json({ ...AVANTAGES_TEST[0], ...corps, id: String(params.id) });
  }),

  http.get("/api/v1/adherents/:adherentId/avantages", () => HttpResponse.json(AVANTAGES_ADHERENT_TEST)),
];
