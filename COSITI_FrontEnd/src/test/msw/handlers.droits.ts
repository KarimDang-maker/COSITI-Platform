import { http, HttpResponse } from "msw";
import type { PeriodeDroits, Retardataire } from "@/api/droits";
import { ADHERENTS_TEST } from "@/test/msw/handlers.adherents";

/**
 * Gestionnaires MSW pour le domaine `droits` (J6). Forme alignée sur le code
 * backend réel livré en parallèle de ce lot
 * (`cm.cositi.api.droits.dto.SituationDroitsDto`/`AdherentEnRetardDto`/
 * `PeriodeDroitsDto`) — voir `src/api/droits.ts` pour l'écart avec l'exemple
 * illustratif de `03_SPECIFICATIONS_API.md §5`.
 */
const SITUATIONS_TEST: Readonly<Record<string, { couvertJusquAu: string | null; joursCouvertsTotal: number; joursRetard: number; cumulCotise: number; eligibleCnps: boolean; statut: string }>> = {
  "adh-1": { couvertJusquAu: "2026-09-20", joursCouvertsTotal: 240, joursRetard: 0, cumulCotise: 240000, eligibleCnps: true, statut: "A_JOUR" },
  "adh-2": { couvertJusquAu: "2026-08-01", joursCouvertsTotal: 90, joursRetard: 14, cumulCotise: 63000, eligibleCnps: true, statut: "EN_RETARD" },
};

const PERIODES_TEST: Readonly<Record<string, readonly PeriodeDroits[]>> = {
  "adh-1": [
    { id: "per-1", adherentId: "adh-1", dateDebut: "2026-01-01", dateFin: "2026-03-31", joursCouverts: 90, montantImpute: 63000, packId: "pack-1000", statut: "COUVERTE", sourceAffectationId: "aff-1" },
    { id: "per-2", adherentId: "adh-1", dateDebut: "2026-04-01", dateFin: "2026-09-20", joursCouverts: 173, montantImpute: 177000, packId: "pack-1000", statut: "COUVERTE", sourceAffectationId: "aff-3" },
  ],
  "adh-2": [
    { id: "per-3", adherentId: "adh-2", dateDebut: "2026-01-01", dateFin: "2026-03-31", joursCouverts: 60, montantImpute: 42000, packId: "pack-700", statut: "COUVERTE", sourceAffectationId: "aff-2" },
    { id: "per-4", adherentId: "adh-2", dateDebut: "2026-04-01", dateFin: "2026-08-01", joursCouverts: 32, montantImpute: 21000, packId: "pack-700", statut: "PARTIELLE", sourceAffectationId: null },
  ],
};

export const RETARDATAIRES_TEST: readonly Retardataire[] = [
  {
    adherentId: "adh-2",
    matricule: "COSITI-00002",
    nomComplet: "ATANGANA Paul",
    couvertJusquAu: "2026-08-01",
    joursRetard: 14,
  },
  {
    adherentId: "adh-3",
    matricule: "COSITI-00003",
    nomComplet: "OWONA Serge",
    couvertJusquAu: null,
    joursRetard: 220,
  },
];

export const handlersDroits = [
  http.get("/api/v1/droits/adherents/:id", ({ params }) => {
    const adherent = ADHERENTS_TEST.find((a) => a.id === params.id);
    const situation = SITUATIONS_TEST[String(params.id)];
    if (!adherent || !situation) {
      return HttpResponse.json(
        { code: "ADHERENT_INTROUVABLE", message: "Adhérent introuvable.", traceId: "t-droits-404", avertissements: [] },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      adherentId: adherent.id,
      matricule: adherent.matricule,
      couvertJusquAu: situation.couvertJusquAu,
      joursCouvertsTotal: situation.joursCouvertsTotal,
      joursRetard: situation.joursRetard,
      cumulCotise: situation.cumulCotise,
      soldeAvantSeuil: 0,
      statut: situation.statut,
      eligibleCnps: situation.eligibleCnps,
      avertissements:
        params.id === "adh-2" ? ["Reliquat de 400 F non imputé — règle de traitement non validée."] : [],
    });
  }),

  http.get("/api/v1/droits/adherents/:id/periodes", ({ params }) => {
    return HttpResponse.json(PERIODES_TEST[String(params.id)] ?? []);
  }),

  /**
   * `ServiceRegulariteImpl.retardataires` (backend réel) trie toujours par
   * retard décroissant, sans paramètre `tri` : ce gestionnaire fait de même,
   * sans lire de paramètre de tri dans la requête.
   */
  http.get("/api/v1/droits/retardataires", ({ request }) => {
    const url = new URL(request.url);
    const joursRetardMin = url.searchParams.get("joursRetardMin");

    let contenu = [...RETARDATAIRES_TEST].sort((a, b) => b.joursRetard - a.joursRetard);
    if (joursRetardMin) contenu = contenu.filter((r) => r.joursRetard >= Number(joursRetardMin));

    return HttpResponse.json({
      contenu,
      page: 0,
      taille: 25,
      totalElements: contenu.length,
      totalPages: 1,
      avertissements: [],
    });
  }),
];
