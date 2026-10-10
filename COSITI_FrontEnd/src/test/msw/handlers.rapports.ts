import { http, HttpResponse } from "msw";
import type { RapportDaf } from "@/api/rapportsDaf";
import type { LigneAudit } from "@/api/audit";

/**
 * Gestionnaires MSW pour les rapports DAF, le journal d'audit et les exports (J10).
 * Forme alignée sur les DTO backend réels (`cm.cositi.api.daf`, `cm.cositi.api.audit`).
 */

const CONTENU_RAPPORT = JSON.stringify({
  montantValide: 3060000,
  montantAControler: 180000,
  nbPaiementsValides: 42,
  nbIncoherences: 1,
  nbPaiementsAnnules: 2,
  nbRemisesCaisseEnEcart: 1,
  avertissement:
    "COSITI enregistre les informations de paiement et n'exécute aucun mouvement de fonds : ces montants sont des encaissements déclarés puis contrôlés, jamais un solde de trésorerie.",
});

const RAPPORT_PRODUIT: RapportDaf = {
  id: "rap-1",
  titre: "Rapport d'août 2026",
  statut: "PRODUIT",
  periodeDebut: "2026-08-01",
  periodeFin: "2026-08-31",
  montantValide: 3_060_000,
  montantAControler: 180_000,
  nbPaiementsValides: 42,
  nbIncoherences: 1,
  contenuJson: CONTENU_RAPPORT,
  commentaire: "Mois conforme aux prévisions.",
  produitLe: "2026-09-02T09:00:00Z",
  produitPar: "daf.test",
  transmisLe: null,
  transmisPar: null,
};

const RAPPORT_TRANSMIS: RapportDaf = {
  ...RAPPORT_PRODUIT,
  id: "rap-2",
  titre: "Rapport de juillet 2026",
  statut: "TRANSMIS",
  periodeDebut: "2026-07-01",
  periodeFin: "2026-07-31",
  transmisLe: "2026-08-03T10:00:00Z",
  transmisPar: "daf.test",
};

export const RAPPORTS_TEST = [RAPPORT_PRODUIT, RAPPORT_TRANSMIS];

const AUDIT_TEST: readonly LigneAudit[] = [
  {
    id: "aud-1",
    horodatage: "2026-09-22T10:12:33Z",
    utilisateurId: "u-daf-1",
    utilisateurIdentifiant: "daf.test",
    typeOperation: "PAIEMENT_VALIDATION",
    entite: "paiement",
    entiteId: "pai-1",
    motif: null,
    resultat: "SUCCES",
  },
  {
    id: "aud-2",
    horodatage: "2026-09-22T09:02:10Z",
    utilisateurId: null,
    utilisateurIdentifiant: null,
    typeOperation: "DROITS_IMPUTATION",
    entite: "periode_droits",
    entiteId: "per-1",
    motif: "Imputation automatique à la validation",
    resultat: "SUCCES",
  },
];

function enveloppe<T>(contenu: readonly T[]) {
  return { contenu, page: 0, taille: 25, totalElements: contenu.length, totalPages: 1, avertissements: [] };
}

export const handlersRapports = [
  http.get("/api/v1/daf/rapports", () => HttpResponse.json(enveloppe(RAPPORTS_TEST))),

  http.get("/api/v1/daf/rapports/:id", ({ params }) => {
    const rapport = RAPPORTS_TEST.find((r) => r.id === params.id);
    if (!rapport) {
      return HttpResponse.json(
        { code: "RAPPORT_INTROUVABLE", message: "Rapport introuvable.", traceId: "t-rap-404" },
        { status: 404 },
      );
    }
    return HttpResponse.json(rapport);
  }),

  http.post("/api/v1/daf/rapports", async ({ request }) => {
    const corps = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...RAPPORT_PRODUIT, id: "rap-nouveau", ...corps }, { status: 201 });
  }),

  http.post("/api/v1/daf/rapports/:id/transmettre", ({ params }) =>
    HttpResponse.json({
      ...(RAPPORTS_TEST.find((r) => r.id === params.id) ?? RAPPORT_PRODUIT),
      statut: "TRANSMIS",
      transmisLe: "2026-09-23T08:00:00Z",
      transmisPar: "daf.test",
    }),
  ),

  http.get("/api/v1/audit", ({ request }) => {
    const entite = new URL(request.url).searchParams.get("entite");
    const contenu = entite ? AUDIT_TEST.filter((l) => l.entite === entite) : AUDIT_TEST;
    return HttpResponse.json(enveloppe(contenu));
  }),

  http.post("/api/v1/exports/:type", ({ params }) =>
    HttpResponse.text('matricule;nom\n"COSITI-00001";"NDONGO"\n', {
      headers: {
        "Content-Type": "text/csv;charset=UTF-8",
        "Content-Disposition": `attachment; filename="cositi-${String(params.type)}-2026-09-23.csv"`,
        "Cache-Control": "no-store",
        "X-Nombre-Lignes": "1",
      },
    }),
  ),
];
