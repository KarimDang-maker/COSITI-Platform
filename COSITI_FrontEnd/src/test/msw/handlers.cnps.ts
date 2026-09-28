import { http, HttpResponse } from "msw";
import type {
  AdherentEligibleCnps,
  DeclarationCnps,
  DossierCnps,
  DossierPrestationCnps,
  HistoriqueDossierPrestationCnps,
  OffreCnps,
  PieceDossierCnps,
  SituationImmatriculationCnps,
  TypePieceCnps,
} from "@/api/cnps";
import type { Document } from "@/api/documents";

/**
 * Gestionnaires MSW pour les domaines `cnps` et `documents` (J7). Forme alignée
 * sur le code backend réel livré dans le même lot
 * (`cm.cositi.api.cnps.dto.*`, `cm.cositi.api.document.dto.DocumentDto`).
 *
 * Les `avertissements` non vides reproduisent le comportement réel du serveur :
 * tant que `PIECES_CNPS_OBLIGATOIRES` et `ASSIETTE_CNPS` sont marqués `[V]`
 * dans la table `parametre`, chaque réponse les porte.
 */

const TYPES_OBLIGATOIRES: readonly TypePieceCnps[] = [
  "CNI_RECTO",
  "CNI_VERSO",
  "ACTE_NAISSANCE",
  "PHOTO_IDENTITE",
  "FORMULAIRE_SIGNE",
];

const AVERTISSEMENT_PIECES =
  "La liste des pièces exigées pour un dossier CNPS (PIECES_CNPS_OBLIGATOIRES) n'est pas validée par la COSITI : un dossier déclaré complet ici peut être refusé par la CNPS.";

const AVERTISSEMENT_ASSIETTE =
  "L'assiette de cotisation CNPS (ASSIETTE_CNPS) n'est pas validée par la COSITI : le montant déclaré correspond aux droits réellement imputés sur le mois, aucun taux ni aucune assiette n'est appliqué.";

function piece(
  dossierId: string,
  typePiece: TypePieceCnps,
  documentId: string | null,
): PieceDossierCnps {
  return {
    id: `piece-${dossierId}-${typePiece}`,
    dossierId,
    typePiece,
    documentId,
    statut: documentId ? "FOURNIE" : "ATTENDUE",
    obligatoire: true,
  };
}

/** Dossier incomplet : deux pièces sur cinq fournies. */
const DOSSIER_INCOMPLET: DossierCnps = {
  id: "dos-1",
  adherentId: "adh-1",
  numeroImmatriculation: null,
  dateImmatriculation: null,
  revenuMensuelDeclare: null,
  statut: "BROUILLON",
  motifRejet: null,
  pieces: [
    piece("dos-1", "CNI_RECTO", "doc-1"),
    piece("dos-1", "CNI_VERSO", "doc-2"),
    piece("dos-1", "ACTE_NAISSANCE", null),
    piece("dos-1", "PHOTO_IDENTITE", null),
    piece("dos-1", "FORMULAIRE_SIGNE", null),
  ],
  piecesManquantes: [
    { typePiece: "ACTE_NAISSANCE", statutActuel: "ATTENDUE" },
    { typePiece: "PHOTO_IDENTITE", statutActuel: "ATTENDUE" },
    { typePiece: "FORMULAIRE_SIGNE", statutActuel: "ATTENDUE" },
  ],
  creeLe: "2026-09-01T08:00:00Z",
  creePar: "gestionnaire.test",
  avertissements: [AVERTISSEMENT_PIECES, AVERTISSEMENT_ASSIETTE],
};

/** Dossier transmis à la CNPS : figé, toutes pièces fournies. */
const DOSSIER_TRANSMIS: DossierCnps = {
  id: "dos-2",
  adherentId: "adh-2",
  numeroImmatriculation: "CNPS-778812",
  dateImmatriculation: "2026-08-15",
  revenuMensuelDeclare: 120000,
  statut: "TRANSMIS",
  motifRejet: null,
  pieces: TYPES_OBLIGATOIRES.map((type) => piece("dos-2", type, `doc-${type}`)),
  piecesManquantes: [],
  creeLe: "2026-07-10T08:00:00Z",
  creePar: "gestionnaire.test",
  avertissements: [AVERTISSEMENT_PIECES],
};

export const DOSSIERS_TEST: readonly DossierCnps[] = [DOSSIER_INCOMPLET, DOSSIER_TRANSMIS];

export const ELIGIBLES_TEST: readonly AdherentEligibleCnps[] = [
  {
    adherentId: "adh-3",
    matricule: "COSITI-00003",
    nomComplet: "OWONA Serge",
    packCode: "PACK_700",
    cumulCotise: 11200,
    seuilEligibilite: 10500,
    dossierOuvert: false,
  },
  {
    adherentId: "adh-1",
    matricule: "COSITI-00001",
    nomComplet: "NDONGO Marie Claire",
    packCode: "PACK_1000",
    cumulCotise: 240000,
    seuilEligibilite: 15000,
    dossierOuvert: true,
  },
];

const DECLARATIONS_TEST: Readonly<Record<string, readonly DeclarationCnps[]>> = {
  "dos-2": [
    {
      id: "dec-1",
      dossierId: "dos-2",
      periodeMois: "2026-08-01",
      montantDeclare: 21000,
      statut: "TRANSMISE",
      dateTransmission: "2026-09-02",
      accuseDocumentId: null,
      creePar: "gestionnaire.test",
      avertissements: [AVERTISSEMENT_ASSIETTE],
    },
    {
      id: "dec-2",
      dossierId: "dos-2",
      periodeMois: "2026-09-01",
      montantDeclare: 14000,
      statut: "A_PRODUIRE",
      dateTransmission: null,
      accuseDocumentId: null,
      creePar: "gestionnaire.test",
      avertissements: [AVERTISSEMENT_ASSIETTE],
    },
  ],
};

const DOCUMENT_TEST: Document = {
  id: "doc-nouveau",
  typeDocument: "CNI",
  nomFichierOriginal: "cni-recto.png",
  typeMime: "image/png",
  tailleOctets: 2048,
  chiffre: true,
  adherentId: "adh-1",
  paiementId: null,
  statut: "AJOUTE",
  analyseAntivirus: "PROPRE",
  telechargeable: true,
  creeLe: "2026-09-22T10:00:00Z",
  creePar: "gestionnaire.test",
};

function enveloppe(contenu: readonly DossierCnps[]) {
  return {
    contenu,
    page: 0,
    taille: 25,
    totalElements: contenu.length,
    totalPages: 1,
    avertissements: [AVERTISSEMENT_PIECES],
  };
}

export const handlersCnps = [
  http.get("/api/v1/cnps/dossiers", ({ request }) => {
    const statut = new URL(request.url).searchParams.get("statut");
    const contenu = statut ? DOSSIERS_TEST.filter((d) => d.statut === statut) : DOSSIERS_TEST;
    return HttpResponse.json(enveloppe(contenu));
  }),

  http.get("/api/v1/cnps/eligibles-non-immatricules", () => HttpResponse.json(ELIGIBLES_TEST)),

  http.get("/api/v1/cnps/dossiers/:id", ({ params }) => {
    const dossier = DOSSIERS_TEST.find((d) => d.id === params.id);
    if (!dossier) {
      return HttpResponse.json(
        {
          code: "CNPS_DOSSIER_INTROUVABLE",
          message: "Dossier CNPS introuvable.",
          traceId: "t-cnps-404",
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(dossier);
  }),

  http.post("/api/v1/cnps/dossiers", ({ request }) => {
    const adherentId = new URL(request.url).searchParams.get("adherentId") ?? "adh-3";
    return HttpResponse.json({ ...DOSSIER_INCOMPLET, id: "dos-nouveau", adherentId }, { status: 201 });
  }),

  http.post("/api/v1/cnps/dossiers/:id/statut", async ({ params, request }) => {
    const corps = (await request.json()) as { statut: string; commentaire?: string };
    const dossier = DOSSIERS_TEST.find((d) => d.id === params.id);
    // Reproduit le refus réel du serveur : on ne déclare pas prêt un dossier incomplet.
    if (corps.statut === "PRET" && dossier && dossier.piecesManquantes.length > 0) {
      return HttpResponse.json(
        {
          code: "CNPS_PIECES_MANQUANTES",
          message:
            "Le dossier ne peut pas passer à PRET : des pièces obligatoires manquent encore.",
          traceId: "t-cnps-409",
        },
        { status: 409 },
      );
    }
    return HttpResponse.json({ ...(dossier ?? DOSSIER_INCOMPLET), statut: corps.statut });
  }),

  http.post("/api/v1/cnps/dossiers/:id/pieces", ({ params }) =>
    HttpResponse.json(DOSSIERS_TEST.find((d) => d.id === params.id) ?? DOSSIER_INCOMPLET),
  ),

  http.get("/api/v1/cnps/declarations", ({ request }) => {
    const dossierId = new URL(request.url).searchParams.get("dossierId") ?? "";
    return HttpResponse.json(DECLARATIONS_TEST[dossierId] ?? []);
  }),

  http.post("/api/v1/cnps/declarations", ({ request }) => {
    const parametres = new URL(request.url).searchParams;
    return HttpResponse.json(
      {
        id: "dec-nouvelle",
        dossierId: parametres.get("dossierId"),
        periodeMois: `${parametres.get("periode")}-01`,
        montantDeclare: 14000,
        statut: "A_PRODUIRE",
        dateTransmission: null,
        accuseDocumentId: null,
        creePar: "gestionnaire.test",
        avertissements: [AVERTISSEMENT_ASSIETTE],
      },
      { status: 201 },
    );
  }),

  http.post("/api/v1/cnps/declarations/:id/transmettre", ({ params }) =>
    HttpResponse.json({
      id: params.id,
      dossierId: "dos-2",
      periodeMois: "2026-09-01",
      montantDeclare: 14000,
      statut: "TRANSMISE",
      dateTransmission: "2026-09-23",
      accuseDocumentId: null,
      creePar: "gestionnaire.test",
      avertissements: [AVERTISSEMENT_ASSIETTE],
    }),
  ),

  // ------------------------------------------------------------- Documents

  http.post("/api/v1/documents", ({ request }) => {
    const type = new URL(request.url).searchParams.get("type") ?? "AUTRE";
    return HttpResponse.json({ ...DOCUMENT_TEST, typeDocument: type }, { status: 201 });
  }),

  http.get("/api/v1/documents", () => HttpResponse.json([DOCUMENT_TEST])),

  http.get("/api/v1/documents/:id", () =>
    HttpResponse.text("contenu-binaire-simule", {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "attachment; filename=\"cni-recto.png\"",
        "Cache-Control": "no-store",
      },
    }),
  ),
];

/* ============================================================================
 * Dossiers de prestation CNPS (module Gestionnaire des comptes) — forme
 * alignée sur `cm.cositi.api.cnps.dto.*` (backend réel, même lot).
 * ========================================================================== */

const OFFRES_TEST: readonly OffreCnps[] = [
  {
    id: "off-pf-1",
    rubrique: "PF",
    code: "PF_ALLOCATIONS_FAMILIALES",
    libelle: "Allocations Familiales (Enfants scolarisés & à charge)",
    description: "Versement périodique pour l'entretien et l'éducation des enfants à charge.",
    delaiLibelle: "15 à 30 jours après dépôt complet",
    badgeMetier: "2 500 à 5 000 FCFA / enfant / mois",
    ordreAffichage: 1,
    pieces: [
      { id: "po-1", offreId: "off-pf-1", libelle: "Extrait d'acte de naissance de l'adhérent", obligatoire: true },
      { id: "po-2", offreId: "off-pf-1", libelle: "Certificats de scolarité", obligatoire: true },
    ],
    nombreDossiers: 2,
  },
  {
    id: "off-rp-1",
    rubrique: "RP",
    code: "RP_ACCIDENT_TRAVAIL",
    libelle: "Accident du Travail & Trajet",
    description: "Prise en charge d'urgence de tout accident survenu sur le lieu d'activité.",
    delaiLibelle: "Déclaration sous 48h obligatoire",
    badgeMetier: "Prise en charge médicale à 100%",
    ordreAffichage: 1,
    pieces: [{ id: "po-3", offreId: "off-rp-1", libelle: "Formulaire officiel de déclaration (DAT)", obligatoire: true }],
    nombreDossiers: 0,
  },
];

const PIECE_PRESTATION_1 = {
  id: "pp-1",
  dossierId: "dp-1",
  pieceOffreId: "po-1",
  libellePiece: "Extrait d'acte de naissance de l'adhérent",
  obligatoire: true,
  documentId: "doc-1",
  statut: "FOURNIE" as const,
  note: null,
};
const PIECE_PRESTATION_2 = {
  id: "pp-2",
  dossierId: "dp-1",
  pieceOffreId: "po-2",
  libellePiece: "Certificats de scolarité",
  obligatoire: true,
  documentId: null,
  statut: "ATTENDUE" as const,
  note: null,
};

export const DOSSIERS_PRESTATION_TEST: readonly DossierPrestationCnps[] = [
  {
    id: "dp-1",
    adherentId: "adh-1",
    adherentMatricule: "COSITI-00001",
    adherentNomComplet: "NDONGO Marie Claire",
    numeroCnps: "CNPS-2026-98432",
    offreId: "off-pf-1",
    offreCode: "PF_ALLOCATIONS_FAMILIALES",
    offreLibelle: "Allocations Familiales (Enfants scolarisés & à charge)",
    rubrique: "PF",
    statut: "INCOMPLET",
    nombrePersonnesACharge: 3,
    dateDepot: "2026-09-01",
    dateTransmissionCnps: null,
    prochaineRelanceLe: "2026-10-01",
    observations: "En attente des certificats de scolarité.",
    motifRejet: null,
    pieces: [PIECE_PRESTATION_1, PIECE_PRESTATION_2],
    piecesManquantes: [{ pieceOffreId: "po-2", libelle: "Certificats de scolarité", statutActuel: "ATTENDUE" }],
    creeLe: "2026-09-01T08:00:00Z",
    creePar: "gestionnaire.test",
  },
];

const JOURNAL_PRESTATION_TEST: readonly HistoriqueDossierPrestationCnps[] = [
  {
    id: "hist-1",
    statutAvant: null,
    statutApres: "INCOMPLET",
    auteurId: "u-gc-1",
    horodatage: "2026-09-01T08:00:00Z",
    commentaire: "Ouverture du dossier",
  },
];

export const SITUATIONS_IMMATRICULATION_TEST: readonly SituationImmatriculationCnps[] = [
  {
    adherentId: "adh-3",
    matricule: "COSITI-00003",
    nomComplet: "OWONA Serge",
    profession: "Menuisier",
    telephone: "+225070000000",
    cumulCotise: 16100,
    seuilEligibilite: 15000,
    numeroCnps: null,
    dateImmatriculation: null,
    dossierOuvert: false,
  },
  {
    adherentId: "adh-1",
    matricule: "COSITI-00001",
    nomComplet: "NDONGO Marie Claire",
    profession: "Commerçante",
    telephone: "+225050000000",
    cumulCotise: 240000,
    seuilEligibilite: 15000,
    numeroCnps: "CNPS-2026-98432",
    dateImmatriculation: "2026-02-18",
    dossierOuvert: true,
  },
];

function envelopperPrestation(contenu: readonly DossierPrestationCnps[]) {
  return { contenu, page: 0, taille: 25, totalElements: contenu.length, totalPages: 1, avertissements: [] };
}

export const handlersDossiersPrestation = [
  http.get("/api/v1/cnps/offres", ({ request }) => {
    const rubrique = new URL(request.url).searchParams.get("rubrique");
    const contenu = rubrique ? OFFRES_TEST.filter((o) => o.rubrique === rubrique) : OFFRES_TEST;
    return HttpResponse.json(contenu);
  }),

  http.get("/api/v1/cnps/dossiers-prestation", ({ request }) => {
    const url = new URL(request.url);
    const statut = url.searchParams.get("statut");
    const recherche = url.searchParams.get("recherche");
    let contenu = DOSSIERS_PRESTATION_TEST;
    if (statut) contenu = contenu.filter((d) => d.statut === statut);
    if (recherche) {
      const motif = recherche.toLowerCase();
      contenu = contenu.filter(
        (d) => d.adherentMatricule?.toLowerCase().includes(motif) || d.adherentNomComplet?.toLowerCase().includes(motif),
      );
    }
    return HttpResponse.json(envelopperPrestation(contenu));
  }),

  http.get("/api/v1/cnps/dossiers-prestation/:id", ({ params }) => {
    const dossier = DOSSIERS_PRESTATION_TEST.find((d) => d.id === params.id);
    if (!dossier) {
      return HttpResponse.json(
        { code: "CNPS_DOSSIER_PRESTATION_INTROUVABLE", message: "Dossier introuvable.", traceId: "t-dp-404" },
        { status: 404 },
      );
    }
    return HttpResponse.json(dossier);
  }),

  http.post("/api/v1/cnps/dossiers-prestation", async ({ request }) => {
    const corps = (await request.json()) as { adherentId: string; offreId: string };
    return HttpResponse.json({ ...DOSSIERS_PRESTATION_TEST[0], id: "dp-nouveau", ...corps }, { status: 201 });
  }),

  http.post("/api/v1/cnps/dossiers-prestation/:id/pieces", ({ params }) =>
    HttpResponse.json(DOSSIERS_PRESTATION_TEST.find((d) => d.id === params.id) ?? DOSSIERS_PRESTATION_TEST[0]),
  ),

  http.post("/api/v1/cnps/dossiers-prestation/:id/statut", async ({ params, request }) => {
    const corps = (await request.json()) as { statut: string; commentaire?: string };
    const dossier = DOSSIERS_PRESTATION_TEST.find((d) => d.id === params.id);
    if (corps.statut === "COMPLET" && dossier && dossier.piecesManquantes.length > 0) {
      return HttpResponse.json(
        { code: "CNPS_PIECES_MANQUANTES", message: "Des pièces obligatoires manquent encore.", traceId: "t-dp-409" },
        { status: 409 },
      );
    }
    return HttpResponse.json({ ...(dossier ?? DOSSIERS_PRESTATION_TEST[0]), statut: corps.statut });
  }),

  http.post("/api/v1/cnps/dossiers-prestation/:id/observations", ({ params }) =>
    HttpResponse.json(DOSSIERS_PRESTATION_TEST.find((d) => d.id === params.id) ?? DOSSIERS_PRESTATION_TEST[0]),
  ),

  http.get("/api/v1/cnps/dossiers-prestation/:id/journal", () => HttpResponse.json(JOURNAL_PRESTATION_TEST)),

  http.get("/api/v1/cnps/immatriculations", () => HttpResponse.json(SITUATIONS_IMMATRICULATION_TEST)),
];
