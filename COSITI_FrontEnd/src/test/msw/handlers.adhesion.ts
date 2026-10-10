import { http, HttpResponse } from "msw";
import type {
  ChampControle,
  CompteursControle,
  ControleDga,
  DecisionControleDga,
  FraisAdhesion,
  StatutActivation,
  StatutControleDga,
  StatutCorrespondance,
} from "@/api/adhesion";
import { CORRESPONDANCES_ANOMALIE } from "@/api/adhesion";
import { UTILISATEURS } from "@/test/msw/donnees";
import type { Utilisateur } from "@/auth/types";

/**
 * Simulacre du parcours d'adhésion (V20) : frais d'adhésion, activation par le Gestionnaire, contrôle
 * documentaire DGA. Il reproduit les règles serveur qui conditionnent l'affichage : permissions V20, frais
 * obligatoire avant activation, auto-validation et auto-contrôle refusés, motif obligatoire, validation refusée
 * tant qu'une anomalie ou une information non vérifiée reste. Les compteurs et le rapprochement sont calculés ici
 * parce que ce fichier joue le rôle du serveur — jamais dans l'application.
 *
 * Jeu initial : `adh-1` est actif, frais validé, contrôle `ctl-1` en attente DGA (transmis par le Gestionnaire) ;
 * `adh-2` n'a ni frais ni activation.
 */

const MONTANT = 1000;

interface EtatAdherent {
  statut: string;
  activeLe: string | null;
  statutControleDga: StatutControleDga;
  premiereSoumission: string | null;
  derniereSoumission: string | null;
}

let ETATS: Record<string, EtatAdherent> = {};
let FRAIS: FraisAdhesion[] = [];
let CONTROLES: ControleDga[] = [];
let compteur = 100;

function frais(partiel: Partial<FraisAdhesion> & Pick<FraisAdhesion, "id" | "adherentId">): FraisAdhesion {
  return {
    reference: `FA-${partiel.id}`,
    adherentMatricule: partiel.adherentId === "adh-1" ? "COSITI-00001" : "COSITI-00002",
    adherentNom: partiel.adherentId === "adh-1" ? "NDONGO Marie Claire" : "ATANGANA Paul",
    agentId: "agent-1",
    agentNom: "Ateba Jean",
    typeFrais: "INSCRIPTION",
    montantAttendu: MONTANT,
    montantRecu: MONTANT,
    ecart: 0,
    devise: "XAF",
    dateCollecte: "2026-09-30",
    statut: "ENREGISTRE",
    enregistrePar: "u-gc-1",
    enregistreLe: "2026-09-30T10:00:00Z",
    validePar: null,
    valideLe: null,
    motifAnomalie: null,
    anomalieSignaleeLe: null,
    resolutionAnomalie: null,
    anomalieResolueLe: null,
    commentaire: null,
    version: 0,
    ...partiel,
  };
}

function champ(id: string, nom: string, libelle: string, valeur: string): ChampControle {
  return {
    id,
    champ: nom,
    libelle,
    valeurNumerique: valeur,
    valeurPhysique: null,
    statutCorrespondance: null,
    commentaire: null,
    verifiePar: null,
    verifieLe: null,
    version: 0,
  };
}

function nouveauControle(id: string, adherentId: string, tour: number, soumisPar: string): ControleDga {
  return {
    id,
    reference: `CD-${id}`,
    adherentId,
    adherentMatricule: adherentId === "adh-1" ? "COSITI-00001" : "COSITI-00002",
    adherentNom: adherentId === "adh-1" ? "NDONGO Marie Claire" : "ATANGANA Paul",
    tour,
    controlePrecedentId: null,
    statut: "EN_ATTENTE",
    soumisPar,
    soumisLe: "2026-10-01T08:00:00Z",
    demarrePar: null,
    demarreLe: null,
    terminePar: null,
    termineLe: null,
    commentaireDecision: null,
    compteurs: compteurs([]),
    documents: [
      {
        id: `${id}-doc-cni`,
        documentId: "doc-cni-1",
        typeDocument: "CNI",
        obligatoire: true,
        statut: "A_VERIFIER",
        champs: [
          champ(`${id}-ch-nom`, "nom", "Nom", "NDONGO"),
          champ(`${id}-ch-prenoms`, "prenoms", "Prénoms", "Marie Claire"),
        ],
      },
    ],
    version: 0,
  };
}

function compteurs(champs: readonly ChampControle[], documents: ControleDga["documents"] = []): CompteursControle {
  const verifies = champs.filter((c) => c.statutCorrespondance !== null);
  return {
    documents: documents.length,
    documentsConformes: documents.filter((d) => d.statut === "CONFORME").length,
    documentsEnAnomalie: documents.filter((d) => d.statut === "ANOMALIE").length,
    champs: champs.length,
    champsVerifies: verifies.length,
    champsConformes: verifies.filter((c) => c.statutCorrespondance === "CORRESPOND").length,
    anomalies: verifies.filter((c) => CORRESPONDANCES_ANOMALIE.includes(c.statutCorrespondance!)).length,
    nonVerifiables: verifies.filter((c) => c.statutCorrespondance === "NON_VERIFIABLE").length,
  };
}

/** Recalcule statuts de documents et compteurs, comme le serveur après chaque vérification. */
function recalculer(c: ControleDga): ControleDga {
  const documents = c.documents.map((d) => {
    const tous = d.champs.every((ch) => ch.statutCorrespondance !== null);
    const anomalie = d.champs.some((ch) => ch.statutCorrespondance && CORRESPONDANCES_ANOMALIE.includes(ch.statutCorrespondance));
    return { ...d, statut: anomalie ? "ANOMALIE" : tous ? "CONFORME" : "A_VERIFIER" };
  });
  const cpt = compteurs(documents.flatMap((d) => d.champs), documents);
  // V21 : le serveur dit lui-même si « Valider » est possible, et pourquoi pas.
  const blocages = [
    ...(cpt.anomalies > 0 ? [`${cpt.anomalies} information(s) en anomalie à traiter.`] : []),
    ...(cpt.champsVerifies < cpt.champs ? [`${cpt.champs - cpt.champsVerifies} information(s) non vérifiée(s).`] : []),
  ];
  return { ...c, documents, compteurs: cpt, validable: blocages.length === 0, blocages, version: (c.version ?? 0) + 1 };
}

export function reinitialiserAdhesion() {
  ETATS = {
    "adh-1": {
      statut: "ACTIF",
      activeLe: "2026-10-01T08:00:00Z",
      statutControleDga: "EN_ATTENTE_DGA",
      premiereSoumission: "2026-10-01T08:00:00Z",
      derniereSoumission: "2026-10-01T08:00:00Z",
    },
    "adh-2": { statut: "EN_RETARD", activeLe: null, statutControleDga: "NON_SOUMIS", premiereSoumission: null, derniereSoumission: null },
  };
  FRAIS = [
    frais({ id: "fa-1", adherentId: "adh-1", statut: "VALIDE", validePar: "u-daf-1", valideLe: "2026-09-30T12:00:00Z" }),
    // Frais d'un tiers enregistré par le Gestionnaire, en attente de validation DAF.
    frais({ id: "fa-2", adherentId: "adh-3", adherentMatricule: "COSITI-00003", adherentNom: "MBARGA Luc", montantRecu: 500, ecart: -500 }),
  ];
  CONTROLES = [recalculer(nouveauControle("ctl-1", "adh-1", 1, "u-gc-1"))];
  compteur = 100;
}
reinitialiserAdhesion();

function utilisateurDe(request: Request) {
  const jeton = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/, "");
  return UTILISATEURS[jeton];
}

function erreur(code: string, message: string, statut: number) {
  return HttpResponse.json({ code, message, traceId: "t-adh", avertissements: [] }, { status: statut });
}

/** L'utilisateur authentifié et habilité, ou la réponse d'erreur que le serveur renverrait. */
function exiger(request: Request, permission: string): Utilisateur | Response {
  const u = utilisateurDe(request);
  if (!u) return erreur("AUTHENTIFICATION_REQUISE", "Authentification requise.", 401);
  if (!u.permissions.includes(permission)) return erreur("ACCES_REFUSE", "Accès refusé.", 403);
  return u;
}

function enveloppe<T>(contenu: readonly T[]) {
  return { contenu, page: 0, taille: 25, totalElements: contenu.length, totalPages: contenu.length > 0 ? 1 : 0, avertissements: [] };
}

function activation(adherentId: string): StatutActivation {
  const e = ETATS[adherentId] ?? ETATS["adh-2"]!;
  const courant = [...CONTROLES].reverse().find((c) => c.adherentId === adherentId) ?? null;
  return {
    adherentId,
    matricule: adherentId === "adh-1" ? "COSITI-00001" : "COSITI-00002",
    statut: e.statut,
    statutValidation: null,
    statutControleDga: e.statutControleDga,
    activeLe: e.activeLe,
    activePar: e.activeLe ? "u-gc-1" : null,
    premiereSoumissionDgaLe: e.premiereSoumission,
    derniereSoumissionDgaLe: e.derniereSoumission,
    controleCourantId: courant?.id ?? null,
    controleCourantReference: courant?.reference ?? null,
    dejaActive: false,
    version: 1,
  };
}

function fraisAdherent(adherentId: string) {
  const f = FRAIS.find((x) => x.adherentId === adherentId) ?? null;
  return { adherentId, montantRequis: MONTANT, devise: "XAF", enregistre: !!f, frais: f };
}

function conditions(adherentId: string) {
  const f = FRAIS.find((x) => x.adherentId === adherentId);
  return [
    { code: "STATUT", libelle: "Statut permettant l'activation", satisfaite: true, bloquant: true, detail: null },
    { code: "IDENTITE", libelle: "Informations obligatoires complètes", satisfaite: true, bloquant: true, detail: null },
    { code: "DOUBLON", libelle: "Aucun doublon bloquant", satisfaite: true, bloquant: true, detail: "Aucun doublon potentiel." },
    {
      code: "FRAIS_ADHESION",
      libelle: "Frais d'adhésion enregistré",
      satisfaite: !!f,
      bloquant: true,
      detail: f ? null : "Enregistrez le frais d'adhésion de 1 000 FCFA collecté par l'agent.",
    },
  ];
}

function remplacerControle(maj: ControleDga) {
  CONTROLES = CONTROLES.map((c) => (c.id === maj.id ? maj : c));
  return maj;
}

function rapprochement() {
  const soumis = Object.entries(ETATS).filter(([, e]) => e.statutControleDga !== "NON_SOUMIS").map(([id]) => id);
  const fraisSoumis = FRAIS.filter((f) => soumis.includes(f.adherentId));
  const enregistre = fraisSoumis.reduce((t, f) => t + f.montantRecu, 0);
  const attendu = soumis.length * MONTANT;
  const ecarts = soumis
    .filter((id) => !FRAIS.some((f) => f.adherentId === id))
    .map((id) => ({
      adherentId: id,
      matricule: id === "adh-1" ? "COSITI-00001" : "COSITI-00002",
      nom: id === "adh-1" ? "NDONGO Marie Claire" : "ATANGANA Paul",
      agentId: null,
      agentNom: null,
      referenceFrais: null,
      montantAttendu: MONTANT,
      montantEnregistre: 0,
      ecart: -MONTANT,
      typeEcart: "SANS_FRAIS",
    }));
  const hors = FRAIS.filter((f) => !soumis.includes(f.adherentId));
  return {
    du: null,
    au: null,
    agentId: null,
    nombreDossiersSoumis: soumis.length,
    montantUnitaire: MONTANT,
    montantAttendu: attendu,
    montantEnregistre: enregistre,
    ecart: enregistre - attendu,
    detailCalcul: `${soumis.length} dossier(s) × 1 000 FCFA = ${attendu.toLocaleString("fr-FR")} FCFA`,
    nombreDossiersSansFrais: ecarts.length,
    nombreEcarts: ecarts.length,
    ecarts,
    fraisHorsSoumission: hors.length,
    montantHorsSoumission: hors.reduce((t, f) => t + f.montantRecu, 0),
    avertissements: [],
  };
}

export const handlersAdhesion = [
  /* ----- Parcours d'un adhérent ----- */
  http.get("/api/v1/adherents/:id/synthese-workflow", ({ request, params }) => {
    const refus = exiger(request, "ADHERENT:LIRE");
    if (refus instanceof Response) return refus;
    const id = String(params.id);
    const courant = [...CONTROLES].reverse().find((c) => c.adherentId === id) ?? null;
    return HttpResponse.json({
      activation: activation(id),
      fraisAdhesion: fraisAdherent(id),
      controleCourant: courant,
      demandeModificationOuverte: false,
    });
  }),
  http.get("/api/v1/adherents/:id/frais-adhesion", ({ request, params }) => {
    const refus = exiger(request, "ADHERENT:LIRE");
    if (refus instanceof Response) return refus;
    return HttpResponse.json(fraisAdherent(String(params.id)));
  }),
  http.post("/api/v1/adherents/:id/frais-adhesion", async ({ request, params }) => {
    const utilisateur = exiger(request, "FRAIS_ADHESION:ENREGISTRER");
    if (utilisateur instanceof Response) return utilisateur;
    const id = String(params.id);
    if (FRAIS.some((f) => f.adherentId === id)) {
      return erreur("FRAIS_ADHESION_DEJA_ENREGISTRE", "Un frais d'adhésion est déjà enregistré pour cet adhérent.", 409);
    }
    const corps = (await request.json()) as { agentId: string; montantRecu?: number; dateCollecte?: string; cleIdempotence: string };
    const recu = corps.montantRecu ?? MONTANT;
    const cree = frais({
      id: `fa-${++compteur}`,
      adherentId: id,
      agentId: corps.agentId,
      montantRecu: recu,
      ecart: recu - MONTANT,
      dateCollecte: corps.dateCollecte ?? "2026-10-02",
      enregistrePar: utilisateur.id,
    });
    FRAIS = [...FRAIS, cree];
    return HttpResponse.json(cree, { status: 201 });
  }),
  http.get("/api/v1/adherents/:id/activation", ({ request, params }) => {
    const refus = exiger(request, "ADHERENT:LIRE");
    if (refus instanceof Response) return refus;
    const id = String(params.id);
    const liste = conditions(id);
    const e = ETATS[id];
    const dejaActive = !!e?.activeLe;
    return HttpResponse.json({
      adherentId: id,
      matricule: null,
      statut: e?.statut ?? "PREINSCRIT",
      statutControleDga: e?.statutControleDga ?? "NON_SOUMIS",
      dejaActive,
      activable: !dejaActive && liste.every((c) => c.satisfaite || !c.bloquant),
      conditions: liste,
      avertissements: [],
    });
  }),
  http.post("/api/v1/adherents/:id/activer", ({ request, params }) => {
    const utilisateur = exiger(request, "ADHERENT:ACTIVER");
    if (utilisateur instanceof Response) return utilisateur;
    const id = String(params.id);
    if (conditions(id).some((c) => c.bloquant && !c.satisfaite)) {
      return erreur("ADHERENT_ACTIVATION_CONDITIONS_NON_REMPLIES", "Le frais d'adhésion n'est pas enregistré.", 422);
    }
    const controle = recalculer(nouveauControle(`ctl-${++compteur}`, id, 1, utilisateur.id));
    CONTROLES = [...CONTROLES, controle];
    ETATS = {
      ...ETATS,
      [id]: {
        statut: "ACTIF",
        activeLe: "2026-10-02T09:00:00Z",
        statutControleDga: "EN_ATTENTE_DGA",
        premiereSoumission: "2026-10-02T09:00:00Z",
        derniereSoumission: "2026-10-02T09:00:00Z",
      },
    };
    return HttpResponse.json(activation(id));
  }),
  http.get("/api/v1/adherents/:id/controles-dga", ({ request, params }) => {
    const refus = exiger(request, "CONTROLE_DGA:LIRE");
    if (refus instanceof Response) return refus;
    return HttpResponse.json(CONTROLES.filter((c) => c.adherentId === params.id));
  }),
  http.post("/api/v1/adherents/:id/soumettre-dga", ({ request, params }) => {
    const utilisateur = exiger(request, "ADHERENT:ACTIVER");
    if (utilisateur instanceof Response) return utilisateur;
    const id = String(params.id);
    const controle = recalculer(nouveauControle(`ctl-${++compteur}`, id, CONTROLES.filter((c) => c.adherentId === id).length + 1, utilisateur.id));
    CONTROLES = [...CONTROLES, controle];
    const e = ETATS[id]!;
    ETATS = { ...ETATS, [id]: { ...e, statutControleDga: "EN_ATTENTE_DGA", derniereSoumission: "2026-10-02T10:00:00Z" } };
    return HttpResponse.json(controle);
  }),

  /* ----- Contrôle documentaire DGA ----- */
  http.get("/api/v1/controles-dga/synthese", ({ request }) => {
    const refus = exiger(request, "CONTROLE_DGA:LIRE");
    if (refus instanceof Response) return refus;
    const parStatut: Record<string, number> = {};
    for (const e of Object.values(ETATS)) parStatut[e.statutControleDga] = (parStatut[e.statutControleDga] ?? 0) + 1;
    return HttpResponse.json({
      du: null,
      au: null,
      dossiersDistinctsSoumis: new Set(CONTROLES.map((c) => c.adherentId)).size,
      resoumissions: CONTROLES.filter((c) => c.tour > 1).length,
      parStatutControle: parStatut,
      champsEnAnomalie: CONTROLES.reduce((t, c) => t + c.compteurs.anomalies, 0),
    });
  }),
  http.get("/api/v1/controles-dga", ({ request }) => {
    const refus = exiger(request, "CONTROLE_DGA:LIRE");
    if (refus instanceof Response) return refus;
    const statuts = new URL(request.url).searchParams.getAll("statut");
    const lignes = CONTROLES.filter((c) => statuts.length === 0 || statuts.includes(c.statut)).map((c) => ({
      controleId: c.id,
      reference: c.reference,
      tour: c.tour,
      statut: c.statut,
      adherentId: c.adherentId,
      matricule: c.adherentMatricule,
      nom: c.adherentNom,
      agentCollecteurId: "agent-1",
      agentCollecteur: "Ateba Jean",
      gestionnaire: "Ndongo Marie",
      activeLe: "2026-10-01T08:00:00Z",
      soumisLe: c.soumisLe,
      nombreDocuments: c.compteurs.documents,
      nombreDocumentsVerifies: c.compteurs.documentsConformes + c.compteurs.documentsEnAnomalie,
      nombreAnomalies: c.compteurs.anomalies,
    }));
    return HttpResponse.json(enveloppe(lignes));
  }),
  http.get("/api/v1/controles-dga/:id/journal", ({ request, params }) => {
    const refus = exiger(request, "CONTROLE_DGA:LIRE");
    if (refus instanceof Response) return refus;
    return HttpResponse.json([
      {
        id: `j-${String(params.id)}`,
        horodatage: "2026-10-01T08:00:00Z",
        utilisateurId: "u-gc-1",
        utilisateurIdentifiant: "gestionnaire.test",
        typeOperation: "ADHERENT_SOUMISSION_DGA",
        entite: "controle_dga",
        entiteId: String(params.id),
        motif: null,
        resultat: "SUCCES",
      },
    ]);
  }),
  http.get("/api/v1/controles-dga/:id", ({ request, params }) => {
    const refus = exiger(request, "CONTROLE_DGA:LIRE");
    if (refus instanceof Response) return refus;
    const c = CONTROLES.find((x) => x.id === params.id);
    return c ? HttpResponse.json(c) : erreur("CONTROLE_DGA_INTROUVABLE", "Contrôle introuvable.", 404);
  }),
  http.post("/api/v1/controles-dga/:id/demarrer", ({ request, params }) => {
    const utilisateur = exiger(request, "CONTROLE_DGA:EFFECTUER");
    if (utilisateur instanceof Response) return utilisateur;
    const c = CONTROLES.find((x) => x.id === params.id)!;
    if (c.soumisPar === utilisateur.id) return erreur("CONTROLE_DGA_AUTO_CONTROLE_INTERDIT", "Vous ne pouvez pas contrôler un dossier que vous avez transmis.", 422);
    const e = ETATS[c.adherentId]!;
    ETATS = { ...ETATS, [c.adherentId]: { ...e, statutControleDga: "EN_VERIFICATION" } };
    return HttpResponse.json(remplacerControle({ ...c, statut: "EN_COURS", demarrePar: utilisateur.id, demarreLe: "2026-10-02T09:30:00Z" }));
  }),
  http.post("/api/v1/controles-dga/:id/champs/:champId/verifier", async ({ request, params }) => {
    const utilisateur = exiger(request, "CONTROLE_DGA:EFFECTUER");
    if (utilisateur instanceof Response) return utilisateur;
    const corps = (await request.json()) as { statutCorrespondance: StatutCorrespondance; valeurPhysique?: string; commentaire?: string };
    if (corps.statutCorrespondance === "NON_CORRESPOND" && !corps.valeurPhysique) {
      return erreur("CONTROLE_DGA_VALEUR_DOCUMENT_REQUISE", "La valeur lue sur le document est obligatoire.", 422);
    }
    if (corps.statutCorrespondance !== "CORRESPOND" && corps.statutCorrespondance !== "NON_APPLICABLE" && !corps.commentaire) {
      return erreur("CONTROLE_DGA_MOTIF_REQUIS", "Le commentaire est obligatoire.", 422);
    }
    const c = CONTROLES.find((x) => x.id === params.id)!;
    const maj: ControleDga = {
      ...c,
      documents: c.documents.map((d) => ({
        ...d,
        champs: d.champs.map((ch) =>
          ch.id === params.champId
            ? {
                ...ch,
                statutCorrespondance: corps.statutCorrespondance,
                valeurPhysique: corps.valeurPhysique ?? ch.valeurNumerique,
                commentaire: corps.commentaire ?? null,
                verifiePar: utilisateur.id,
                verifieLe: "2026-10-02T09:40:00Z",
                version: (ch.version ?? 0) + 1,
              }
            : ch,
        ),
      })),
    };
    return HttpResponse.json(remplacerControle(recalculer(maj)));
  }),
  http.post("/api/v1/controles-dga/:id/terminer", async ({ request, params }) => {
    const utilisateur = exiger(request, "CONTROLE_DGA:EFFECTUER");
    if (utilisateur instanceof Response) return utilisateur;
    const corps = (await request.json()) as { decision: DecisionControleDga; commentaire?: string };
    const c = CONTROLES.find((x) => x.id === params.id)!;
    if (corps.decision !== "VALIDER" && !corps.commentaire) return erreur("CONTROLE_DGA_MOTIF_REQUIS", "Le commentaire est obligatoire.", 422);
    if (corps.decision === "VALIDER" && c.compteurs.anomalies > 0) {
      return erreur("CONTROLE_DGA_ANOMALIES_NON_TRAITEES", "Des anomalies restent à traiter : demandez une correction.", 409);
    }
    if (corps.decision === "VALIDER" && c.compteurs.champsVerifies < c.compteurs.champs) {
      return erreur("CONTROLE_DGA_CHAMPS_NON_VERIFIES", "Toutes les informations doivent être vérifiées.", 409);
    }
    const statut = corps.decision === "VALIDER" ? "VALIDE" : corps.decision === "REJETER" ? "REJETE" : "CORRECTION_DEMANDEE";
    const e = ETATS[c.adherentId]!;
    ETATS = { ...ETATS, [c.adherentId]: { ...e, statutControleDga: statut } };
    return HttpResponse.json(
      remplacerControle({ ...c, statut, terminePar: utilisateur.id, termineLe: "2026-10-02T10:00:00Z", commentaireDecision: corps.commentaire ?? null }),
    );
  }),

  /* ----- Frais d'adhésion ----- */
  http.get("/api/v1/frais-adhesion/configuration", () =>
    HttpResponse.json({ typeFrais: "INSCRIPTION", montantUnitaire: MONTANT, devise: "XAF", parametre: "MONTANT_INSCRIPTION", regleValidee: true }),
  ),
  http.get("/api/v1/frais-adhesion/rapprochement", ({ request }) => {
    const refus = exiger(request, "FRAIS_ADHESION:LIRE");
    return refus instanceof Response ? refus : HttpResponse.json(rapprochement());
  }),
  http.get("/api/v1/frais-adhesion/agents/:agentId/synthese", ({ request, params }) => {
    const refus = exiger(request, "FRAIS_ADHESION:LIRE");
    if (refus instanceof Response) return refus;
    const siens = FRAIS.filter((f) => f.agentId === params.agentId);
    const recu = siens.reduce((t, f) => t + f.montantRecu, 0);
    const parStatut: Record<string, number> = {};
    for (const f of siens) parStatut[f.statut] = (parStatut[f.statut] ?? 0) + 1;
    return HttpResponse.json({
      du: null,
      au: null,
      agentId: String(params.agentId),
      nombreFrais: siens.length,
      montantAttendu: siens.length * MONTANT,
      montantRecu: recu,
      ecart: recu - siens.length * MONTANT,
      nombreParStatut: parStatut,
      parJour: [],
    });
  }),
  http.get("/api/v1/frais-adhesion/synthese", ({ request }) => {
    const refus = exiger(request, "FRAIS_ADHESION:LIRE");
    if (refus instanceof Response) return refus;
    const parStatut: Record<string, number> = {};
    for (const f of FRAIS) parStatut[f.statut] = (parStatut[f.statut] ?? 0) + 1;
    const recu = FRAIS.reduce((t, f) => t + f.montantRecu, 0);
    return HttpResponse.json({
      du: null,
      au: null,
      agentId: null,
      nombreFrais: FRAIS.length,
      montantAttendu: FRAIS.length * MONTANT,
      montantRecu: recu,
      ecart: recu - FRAIS.length * MONTANT,
      nombreParStatut: parStatut,
      parJour: [],
    });
  }),
  http.get("/api/v1/frais-adhesion", ({ request }) => {
    const refus = exiger(request, "FRAIS_ADHESION:LIRE");
    if (refus instanceof Response) return refus;
    const url = new URL(request.url);
    const statut = url.searchParams.get("statut");
    const ecarts = url.searchParams.get("seulementEcarts") === "true";
    return HttpResponse.json(enveloppe(FRAIS.filter((f) => (!statut || f.statut === statut) && (!ecarts || f.ecart !== 0))));
  }),
  http.get("/api/v1/frais-adhesion/:id", ({ request, params }) => {
    const refus = exiger(request, "ADHERENT:LIRE");
    if (refus instanceof Response) return refus;
    const f = FRAIS.find((x) => x.id === params.id);
    return f ? HttpResponse.json(f) : erreur("FRAIS_ADHESION_INTROUVABLE", "Frais d'adhésion introuvable.", 404);
  }),
  http.post("/api/v1/frais-adhesion/:id/valider", ({ request, params }) => {
    const utilisateur = exiger(request, "FRAIS_ADHESION:VALIDER");
    if (utilisateur instanceof Response) return utilisateur;
    const f = FRAIS.find((x) => x.id === params.id)!;
    if (f.enregistrePar === utilisateur.id) {
      return erreur("FRAIS_ADHESION_AUTO_VALIDATION_INTERDITE", "Vous ne pouvez pas valider un frais que vous avez enregistré.", 422);
    }
    const maj = { ...f, statut: "VALIDE" as const, validePar: utilisateur.id, valideLe: "2026-10-02T11:00:00Z" };
    FRAIS = FRAIS.map((x) => (x.id === f.id ? maj : x));
    return HttpResponse.json(maj);
  }),
  http.post("/api/v1/frais-adhesion/:id/anomalie", async ({ request, params }) => {
    const refus = exiger(request, "FRAIS_ADHESION:SIGNALER");
    if (refus instanceof Response) return refus;
    const { motif } = (await request.json()) as { motif: string };
    if (!motif) return erreur("FRAIS_ADHESION_MOTIF_REQUIS", "Le motif est obligatoire.", 422);
    const f = FRAIS.find((x) => x.id === params.id)!;
    const maj = { ...f, statut: "ANOMALIE" as const, motifAnomalie: motif, anomalieSignaleeLe: "2026-10-02T11:00:00Z" };
    FRAIS = FRAIS.map((x) => (x.id === f.id ? maj : x));
    return HttpResponse.json(maj);
  }),
];
