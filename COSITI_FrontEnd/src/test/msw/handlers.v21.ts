import { http, HttpResponse } from "msw";
import type { ChecklistDocumentaire, ExigenceDocumentaire, NiveauExigence } from "@/api/adhesion";
import type { Association } from "@/api/adherents";
import type { RegleEnAttente } from "@/api/regles";
import type { Utilisateur } from "@/auth/types";
import { UTILISATEURS } from "@/test/msw/donnees";

/**
 * Simulacre des routes V21 : matrice documentaire, checklist d'un adhérent, règles en attente et leur confirmation
 * (`REGLE:VALIDER`), référentiel des associations, répartition d'une cotisation. Il reproduit les règles serveur qui
 * conditionnent l'affichage : seule une pièce obligatoire **confirmée** bloque l'activation, motif obligatoire,
 * conflit de version.
 */

function exigence(partiel: Partial<ExigenceDocumentaire> & Pick<ExigenceDocumentaire, "id" | "code" | "libelle">): ExigenceDocumentaire {
  return {
    rubrique: "Identité",
    typeDocument: null,
    champ: null,
    niveau: "OBLIGATOIRE",
    conditionApplication: null,
    verificationDga: true,
    statutValidation: "V",
    bloquante: false,
    effectifDu: "2026-10-01",
    effectifJusquau: null,
    actif: true,
    ordre: 0,
    version: 0,
    ...partiel,
  };
}

let EXIGENCES: ExigenceDocumentaire[] = [];
let PARAMETRES: RegleEnAttente[] = [];

export function reinitialiserV21() {
  EXIGENCES = [
    exigence({ id: "ex-cni", code: "PIECE_CNI", libelle: "Carte nationale d'identité", typeDocument: "CNI", ordre: 1 }),
    exigence({ id: "ex-cni-nom", code: "CNI_NOM", libelle: "Nom", typeDocument: "CNI", champ: "nom", ordre: 2 }),
    exigence({ id: "ex-acte", code: "PIECE_ACTE", libelle: "Acte de naissance", typeDocument: "ACTE_NAISSANCE", ordre: 3 }),
    exigence({
      id: "ex-residence",
      code: "PIECE_RESIDENCE",
      rubrique: "Résidence",
      libelle: "Justificatif de résidence",
      typeDocument: "JUSTIFICATIF_RESIDENCE",
      niveau: "CONDITIONNELLE",
      conditionApplication: "Si l'adresse déclarée diffère de celle de la CNI",
      verificationDga: false,
      ordre: 4,
    }),
  ];
  PARAMETRES = [
    {
      source: "PARAMETRE",
      id: "par-droits",
      cle: "DROITS_COMPOSANTES_IMPUTABLES",
      libelle: "Composantes imputées aux droits",
      valeur: "CNPS,EPARGNE,COOPERATIVE",
      statutValidation: "V",
      modifieLe: "2026-10-02T08:00:00Z",
      modifiePar: "migration V21",
    },
  ];
}
reinitialiserV21();

function utilisateurDe(request: Request): Utilisateur | undefined {
  const jeton = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/, "");
  return UTILISATEURS[jeton];
}

function erreur(code: string, message: string, statut: number) {
  return HttpResponse.json({ code, message, traceId: "t-v21", avertissements: [] }, { status: statut });
}

function exiger(request: Request, ...permissions: string[]): Utilisateur | Response {
  const u = utilisateurDe(request);
  if (!u) return erreur("AUTHENTIFICATION_REQUISE", "Authentification requise.", 401);
  if (!permissions.some((p) => u.permissions.includes(p))) return erreur("ACCES_REFUSE", "Accès refusé.", 403);
  return u;
}

function estBloquante(e: ExigenceDocumentaire) {
  return e.niveau === "OBLIGATOIRE" && e.statutValidation === "C";
}

function checklist(adherentId: string): ChecklistDocumentaire {
  const pieces = EXIGENCES.filter((e) => e.actif && !e.champ).map((e) => {
    const fournie = e.typeDocument === "CNI";
    const statut = fournie ? "FOURNI" : e.niveau === "OBLIGATOIRE" ? "REQUIS" : "NON_FOURNI";
    return {
      exigenceId: e.id,
      code: e.code,
      rubrique: e.rubrique,
      typeDocument: e.typeDocument,
      libelle: e.libelle,
      niveau: e.niveau,
      statutValidationRegle: e.statutValidation,
      bloquante: estBloquante(e),
      verificationDga: e.verificationDga,
      conditionApplication: e.conditionApplication,
      statut: statut as ChecklistDocumentaire["pieces"][number]["statut"],
      documentId: fournie ? "doc-nouveau" : null,
      versionDocument: fournie ? 1 : null,
      valideJusquau: fournie ? "2030-01-01" : null,
      champs: EXIGENCES.filter((c) => c.champ && c.typeDocument === e.typeDocument).map((c) => ({
        exigenceId: c.id,
        champ: c.champ!,
        libelle: c.libelle,
        valeurNumerique: "NDONGO",
        dernierResultatDga: null,
        commentaireDga: null,
      })),
    };
  });
  const bloquantesManquantes = pieces.filter((p) => p.bloquante && p.statut === "REQUIS").length;
  return {
    adherentId,
    matricule: adherentId === "adh-1" ? "COSITI-00001" : "COSITI-00002",
    pieces,
    compteurs: {
      pieces: pieces.length,
      obligatoires: pieces.filter((p) => p.niveau === "OBLIGATOIRE").length,
      fournies: pieces.filter((p) => p.documentId).length,
      validees: 0,
      enAnomalie: 0,
      bloquantesManquantes,
    },
    pretPourActivation: bloquantesManquantes === 0,
    avertissements: pieces.some((p) => p.niveau === "OBLIGATOIRE" && p.statutValidationRegle !== "C")
      ? ["Des pièces obligatoires ne sont pas encore confirmées par la COSITI : signalées, elles ne bloquent pas."]
      : [],
  };
}

const ASSOCIATIONS: readonly Association[] = [
  {
    id: "assoc-1",
    code: "ASS-001",
    nom: "Association des commerçants de Bonabéri",
    type: "COMMERCANTS",
    contactNom: null,
    contactTelephone: null,
    zoneId: "zone-1",
    dateConvention: "2025-06-01",
    active: true,
  },
];

export const handlersV21 = [
  http.get("/api/v1/exigences-documentaires", ({ request }) => {
    const refus = exiger(request, "ADHERENT:LIRE", "ADMINISTRATION:LIRE", "REGLE:VALIDER");
    if (refus instanceof Response) return refus;
    const enVigueur = new URL(request.url).searchParams.get("enVigueur") === "true";
    return HttpResponse.json(EXIGENCES.filter((e) => !enVigueur || e.actif).map((e) => ({ ...e, bloquante: estBloquante(e) })));
  }),
  http.get("/api/v1/adherents/:id/checklist-documentaire", ({ request, params }) => {
    const refus = exiger(request, "ADHERENT:LIRE");
    if (refus instanceof Response) return refus;
    return HttpResponse.json(checklist(String(params.id)));
  }),
  http.get("/api/v1/associations", ({ request }) => {
    const refus = exiger(request, "ADHERENT:LIRE");
    return refus instanceof Response ? refus : HttpResponse.json(ASSOCIATIONS);
  }),
  http.get("/api/v1/regles/en-attente", ({ request }) => {
    const refus = exiger(request, "ADMINISTRATION:LIRE", "REGLE:VALIDER");
    if (refus instanceof Response) return refus;
    const exigencesV = EXIGENCES.filter((e) => e.statutValidation !== "C");
    const regles: RegleEnAttente[] = [
      ...PARAMETRES.filter((p) => p.statutValidation !== "C"),
      ...exigencesV.map((e) => ({
        source: "EXIGENCE_DOCUMENTAIRE" as const,
        id: e.id,
        cle: e.code,
        libelle: e.libelle,
        valeur: e.niveau,
        statutValidation: e.statutValidation,
        modifieLe: null,
        modifiePar: null,
      })),
    ];
    return HttpResponse.json({
      parametresNonValides: PARAMETRES.filter((p) => p.statutValidation === "V").length,
      parametresProposes: PARAMETRES.filter((p) => p.statutValidation === "A").length,
      exigencesNonConfirmees: exigencesV.length,
      regles,
    });
  }),
  http.post("/api/v1/regles/parametres/:cle/valider", async ({ request, params }) => {
    const refus = exiger(request, "REGLE:VALIDER");
    if (refus instanceof Response) return refus;
    const { motif } = (await request.json()) as { motif?: string };
    if (!motif) return erreur("REGLE_MOTIF_REQUIS", "Le motif est obligatoire.", 422);
    PARAMETRES = PARAMETRES.map((p) => (p.cle === params.cle ? { ...p, statutValidation: "C" } : p));
    return HttpResponse.json(PARAMETRES.find((p) => p.cle === params.cle));
  }),
  http.post("/api/v1/regles/exigences/:id/valider", async ({ request, params }) => {
    const refus = exiger(request, "REGLE:VALIDER");
    if (refus instanceof Response) return refus;
    const { motif } = (await request.json()) as { motif?: string };
    if (!motif) return erreur("REGLE_MOTIF_REQUIS", "Le motif est obligatoire.", 422);
    EXIGENCES = EXIGENCES.map((e) => (e.id === params.id ? { ...e, statutValidation: "C", version: (e.version ?? 0) + 1 } : e));
    const e = EXIGENCES.find((x) => x.id === params.id)!;
    return HttpResponse.json({ ...e, bloquante: estBloquante(e) });
  }),
  http.put("/api/v1/regles/exigences/:id", async ({ request, params }) => {
    const refus = exiger(request, "REGLE:VALIDER");
    if (refus instanceof Response) return refus;
    const corps = (await request.json()) as { niveau: NiveauExigence; motif?: string; version?: number | null; actif: boolean };
    const actuelle = EXIGENCES.find((x) => x.id === params.id)!;
    if (!corps.motif) return erreur("REGLE_MOTIF_REQUIS", "Le motif est obligatoire.", 422);
    if (corps.version !== undefined && corps.version !== null && corps.version !== actuelle.version) {
      return erreur("EXIGENCE_VERSION_OBSOLETE", "L'exigence a été modifiée entre-temps.", 409);
    }
    const maj = { ...actuelle, niveau: corps.niveau, actif: corps.actif, version: (actuelle.version ?? 0) + 1 };
    EXIGENCES = EXIGENCES.map((x) => (x.id === maj.id ? maj : x));
    return HttpResponse.json({ ...maj, bloquante: estBloquante(maj) });
  }),
  http.get("/api/v1/paiements/:id/affectations", ({ params }) =>
    HttpResponse.json([
      {
        id: "aff-1",
        paiementId: String(params.id),
        composanteId: "comp-cnps",
        montant: 700,
        regleAppliquee: "SECURITE_SOCIALE_MINIMUM_700_PUIS_EPARGNE",
        composanteCode: "CNPS",
        composanteLibelle: "Sécurité sociale",
      },
      {
        id: "aff-2",
        paiementId: String(params.id),
        composanteId: "comp-epargne",
        montant: 300,
        regleAppliquee: "SECURITE_SOCIALE_MINIMUM_700_PUIS_EPARGNE",
        composanteCode: "EPARGNE",
        composanteLibelle: "Épargne",
      },
    ]),
  ),
];
