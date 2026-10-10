import { http, HttpResponse } from "msw";
import type {
  ChecklistArchivageDossier,
  CorpsChangementArchivage,
  FiltreParcours,
  ParametresCnps,
  ResumeParcours,
  SituationParcours,
} from "@/api/parcoursCnps";

/**
 * Gestionnaires MSW du parcours CNPS : formes alignées sur `SituationParcoursDto`, `ParametresCnpsDto`,
 * `ChecklistArchivageDto` (backend `cm.cositi.api.cnps.parcours` et `.cnps.archivage`). Les filtres reproduisent les
 * libellés de l'énumération serveur ; les refus métier sont surchargés au cas par cas via `serveur.use(...)`.
 */

function situation(surcharge: Partial<SituationParcours> & Pick<SituationParcours, "adherentId" | "nomComplet" | "matricule">): SituationParcours {
  return {
    zoneId: "zone-1",
    cumulCotise: 0,
    etape: "NON_ELIGIBLE",
    fenetre: "FENETRE_1",
    enRetard: false,
    reporte: false,
    nbReports: 0,
    vagueMois: "2026-10-01",
    horsDelaiDepot: false,
    joursRestantsDepot: null,
    eligibleImmat: false,
    resteAvantPreimmat: 0,
    resteAvantImmat: 0,
    datePreimmatriculation: null,
    numeroTemporaire: null,
    dateLimiteDepot: null,
    dateDepotCps: null,
    depotHorsDelai: false,
    cps: null,
    numeroImmatriculation: null,
    dateImmatriculation: null,
    dossierId: null,
    piecesManquantes: 0,
    piecesBloquantes: 0,
    ...surcharge,
  };
}

export const SITUATIONS_PARCOURS_TEST: readonly SituationParcours[] = [
  situation({
    adherentId: "adh-p1",
    matricule: "COSITI-00011",
    nomComplet: "OWONA Serge",
    cumulCotise: 11200,
    etape: "ELIGIBLE_PREIMMAT",
  }),
  situation({
    adherentId: "adh-p2",
    matricule: "COSITI-00012",
    nomComplet: "ATANGANA Paul",
    cumulCotise: 12000,
    etape: "ELIGIBLE_PREIMMAT",
    fenetre: "FENETRE_2",
    enRetard: true,
  }),
  situation({
    adherentId: "adh-p3",
    matricule: "COSITI-00013",
    nomComplet: "MBARGA Estelle",
    cumulCotise: 14000,
    etape: "PREIMMATRICULE",
    reporte: true,
    nbReports: 2,
    resteAvantImmat: 7000,
    datePreimmatriculation: "2026-10-02",
    numeroTemporaire: "TMP-0042",
    dateLimiteDepot: "2026-11-01",
    joursRestantsDepot: 12,
  }),
  situation({
    adherentId: "adh-p4",
    matricule: "COSITI-00014",
    nomComplet: "FOUDA Clarisse",
    cumulCotise: 15000,
    etape: "PREIMMATRICULE",
    horsDelaiDepot: true,
    joursRestantsDepot: -3,
    resteAvantImmat: 6000,
    dateLimiteDepot: "2026-10-05",
    numeroTemporaire: "TMP-0043",
  }),
  situation({
    adherentId: "adh-p5",
    matricule: "COSITI-00015",
    nomComplet: "TCHOUA Boris",
    cumulCotise: 22000,
    etape: "DOSSIER_DEPOSE",
    eligibleImmat: true,
    dateDepotCps: "2026-10-03",
    cps: "CPS Yaoundé 1",
    dossierId: "dos-p5",
    piecesManquantes: 2,
    piecesBloquantes: 1,
    numeroTemporaire: "TMP-0044",
  }),
  situation({
    adherentId: "adh-p6",
    matricule: "COSITI-00016",
    nomComplet: "BELINGA Ruth",
    cumulCotise: 25000,
    etape: "IMMATRICULE",
    eligibleImmat: true,
    numeroImmatriculation: "CNPS-990011",
    dateImmatriculation: "2026-09-20",
    dossierId: "dos-p6",
  }),
];

const PREDICATS: Readonly<Record<FiltreParcours, (s: SituationParcours) => boolean>> = {
  TOUS: () => true,
  A_PREIMMATRICULER: (s) => s.etape === "ELIGIBLE_PREIMMAT",
  EN_RETARD: (s) => s.enRetard,
  REPORTES: (s) => s.reporte,
  DELAI_DEPOT: (s) => s.etape === "PREIMMATRICULE",
  DEPOT_HORS_DELAI: (s) => s.horsDelaiDepot,
  IMMAT_ELIGIBLES: (s) => s.eligibleImmat && s.etape !== "IMMATRICULE",
  IMMAT_NON_ELIGIBLES: (s) => !s.eligibleImmat && (s.etape === "PREIMMATRICULE" || s.etape === "DOSSIER_DEPOSE"),
  IMMATRICULES: (s) => s.etape === "IMMATRICULE",
  PIECES_MANQUANTES: (s) => s.piecesManquantes > 0,
};

export const RESUME_PARCOURS_TEST: ResumeParcours = {
  aPreimmatriculer: 2,
  enRetard: 1,
  reportes: 1,
  delaiDepotEnCours: 2,
  delaiDepotDepasse: 1,
  dossiersDeposes: 1,
  eligiblesImmat: 1,
  nonEligiblesImmat: 2,
  immatricules: 1,
  dossiersPiecesManquantes: 1,
  quotaPreimmat: 10500,
  quotaImmat: 21000,
  jourCoupure: 15,
  delaiDepotJours: 30,
  fenetreCourante: "FENETRE_2",
};

export const PARAMETRES_CNPS_TEST: ParametresCnps = {
  quotaPreimmat: 10500,
  quotaImmat: 21000,
  jourCoupure: 15,
  delaiDepotJours: 30,
  motif: null,
};

export const CHECKLIST_ARCHIVAGE_TEST: ChecklistArchivageDossier = {
  dossierId: "dos-p5",
  adherentId: "adh-p5",
  piecesBloquantes: 3,
  piecesBloquantesPretes: 1,
  complete: false,
  lignes: [
    {
      codePiece: "CNI_RECTO",
      libelle: "CNI recto",
      bloquante: true,
      statut: "NON_FOURNIE",
      documentId: null,
      nomFichier: null,
      referencePhysique: null,
      motif: null,
      modifieLe: null,
      modifiePar: null,
    },
    {
      codePiece: "ACTE_NAISSANCE",
      libelle: "Acte de naissance",
      bloquante: true,
      statut: "FOURNIE",
      documentId: "doc-1",
      nomFichier: "acte.pdf",
      referencePhysique: null,
      motif: null,
      modifieLe: "2026-10-04T09:00:00Z",
      modifiePar: "gestionnaire.test",
    },
    {
      codePiece: "PHOTO_IDENTITE",
      libelle: "Photo d'identité",
      bloquante: true,
      statut: "VERIFIEE",
      documentId: "doc-2",
      nomFichier: "photo.png",
      referencePhysique: "CL-12",
      motif: null,
      modifieLe: "2026-10-05T09:00:00Z",
      modifiePar: "gestionnaire.test",
    },
    {
      codePiece: "FORMULAIRE_SIGNE",
      libelle: "Formulaire signé",
      bloquante: false,
      statut: "ARCHIVEE",
      documentId: null,
      nomFichier: null,
      referencePhysique: "CL-13",
      motif: null,
      modifieLe: "2026-10-06T09:00:00Z",
      modifiePar: "gestionnaire.test",
    },
  ],
};

export const handlersParcoursCnps = [
  http.get("/api/v1/cnps/parcours/resume", () => HttpResponse.json(RESUME_PARCOURS_TEST)),

  http.get("/api/v1/cnps/parcours/adherents/:id", ({ params }) => {
    const trouvee = SITUATIONS_PARCOURS_TEST.find((s) => s.adherentId === params.id);
    if (!trouvee) {
      return HttpResponse.json(
        { code: "CNPS_PARCOURS_INTROUVABLE", message: "Adhérent introuvable.", traceId: "t-parcours-404" },
        { status: 404 },
      );
    }
    return HttpResponse.json(trouvee);
  }),

  http.get("/api/v1/cnps/parcours", ({ request }) => {
    const filtre = (new URL(request.url).searchParams.get("filtre") ?? "TOUS") as FiltreParcours;
    const predicat = PREDICATS[filtre] ?? PREDICATS.TOUS;
    return HttpResponse.json(SITUATIONS_PARCOURS_TEST.filter(predicat));
  }),

  http.post("/api/v1/cnps/parcours/adherents/:id/preimmatriculer", async ({ params, request }) => {
    const corps = (await request.json()) as { numeroTemporaire: string };
    const trouvee = SITUATIONS_PARCOURS_TEST.find((s) => s.adherentId === params.id) ?? SITUATIONS_PARCOURS_TEST[0]!;
    return HttpResponse.json({ ...trouvee, etape: "PREIMMATRICULE", numeroTemporaire: corps.numeroTemporaire });
  }),

  http.post("/api/v1/cnps/parcours/adherents/:id/depot-dossier", async ({ params, request }) => {
    const corps = (await request.json()) as { cps: string };
    const trouvee = SITUATIONS_PARCOURS_TEST.find((s) => s.adherentId === params.id) ?? SITUATIONS_PARCOURS_TEST[2]!;
    return HttpResponse.json({ ...trouvee, etape: "DOSSIER_DEPOSE", cps: corps.cps });
  }),

  http.post("/api/v1/cnps/parcours/adherents/:id/immatriculer", async ({ params, request }) => {
    const corps = (await request.json()) as { numeroImmatriculation: string };
    const trouvee = SITUATIONS_PARCOURS_TEST.find((s) => s.adherentId === params.id) ?? SITUATIONS_PARCOURS_TEST[4]!;
    return HttpResponse.json({ ...trouvee, etape: "IMMATRICULE", numeroImmatriculation: corps.numeroImmatriculation });
  }),

  http.get("/api/v1/cnps/parametres", () => HttpResponse.json(PARAMETRES_CNPS_TEST)),

  http.put("/api/v1/cnps/parametres", async ({ request }) => {
    const corps = (await request.json()) as ParametresCnps;
    return HttpResponse.json({ ...corps, motif: null });
  }),

  http.get("/api/v1/cnps/dossiers/:dossierId/checklist-archivage", () => HttpResponse.json(CHECKLIST_ARCHIVAGE_TEST)),

  http.patch("/api/v1/cnps/dossiers/:dossierId/checklist-archivage/:codePiece", async ({ params, request }) => {
    const corps = (await request.json()) as CorpsChangementArchivage;
    return HttpResponse.json({
      ...CHECKLIST_ARCHIVAGE_TEST,
      lignes: CHECKLIST_ARCHIVAGE_TEST.lignes.map((l) =>
        l.codePiece === params.codePiece ? { ...l, statut: corps.statut, motif: corps.motif ?? null } : l,
      ),
    });
  }),

  http.get("/api/v1/cnps/archivage/dossiers-incomplets", () =>
    HttpResponse.json([
      {
        dossierId: "dos-p5",
        adherentId: "adh-p5",
        matricule: "COSITI-00015",
        nomComplet: "TCHOUA Boris",
        piecesManquantes: ["CNI_RECTO", "ACTE_NAISSANCE"],
      },
    ]),
  ),
];
