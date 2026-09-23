import { http, HttpResponse } from "msw";
import type {
  AdherentEligibleCnps,
  DeclarationCnps,
  DossierCnps,
  PieceDossierCnps,
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
