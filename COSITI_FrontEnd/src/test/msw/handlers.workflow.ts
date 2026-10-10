import { http, HttpResponse } from "msw";
import type {
  DecisionDemande,
  DemandeValidation,
  ElementDemande,
  PropositionChamp,
  StatutDemandeValidation,
  TypeEntiteWorkflow,
  TypeOperationWorkflow,
} from "@/api/workflow";
import { PERMISSION_DECISION, STATUTS_DEMANDE_OUVERTS } from "@/api/workflow";
import { UTILISATEURS } from "@/test/msw/donnees";
import { ADHERENTS_TEST } from "@/test/msw/handlers.adherents";
import { AGENTS_TEST } from "@/test/msw/handlers.organisation";
import { PAIEMENTS_TEST } from "@/test/msw/handlers.paiements";

/**
 * Simulacre du workflow Maker–Checker (V19). Il reproduit les règles du serveur qui conditionnent l'affichage :
 * une seule demande ouverte par entité (409 `DEMANDE_ACTIVE_EXISTANTE`), auto-validation refusée (403
 * `DEMANDE_AUTO_VALIDATION_INTERDITE`), motif obligatoire au rejet et à la correction, permission de décision
 * par type d'opération, file « en attente » sans les demandes du validateur.
 */

function element(id: string, champ: string, ancienne: string | null, proposee: string | null): ElementDemande {
  return { id, champ, typeDonnee: "TEXTE", ancienneValeur: ancienne, valeurProposee: proposee, motifChangement: null };
}

function demande(partiel: Partial<DemandeValidation> & Pick<DemandeValidation, "id" | "reference" | "typeEntite" | "entiteId" | "typeOperation" | "statut">): DemandeValidation {
  return {
    demandePar: "u-gc-1",
    demandeParIdentifiant: "gestionnaire.test",
    demandeLe: "2026-10-01T09:42:00Z",
    soumiseLe: "2026-10-01T09:42:00Z",
    examineePar: null,
    examineeLe: null,
    appliqueeLe: null,
    motif: "Le numéro précédent n'est plus utilisé.",
    commentaireValidateur: null,
    versionBase: 3,
    version: 0,
    elements: [],
    documents: [],
    avertissements: [],
    ...partiel,
  };
}

export let DEMANDES_TEST: DemandeValidation[] = [
  // Modification d'un adhérent validé, demandée par le Gestionnaire : décidable par la DGA, pas par lui.
  demande({
    id: "dem-1",
    reference: "DV-000001",
    typeEntite: "ADHERENT",
    entiteId: "adh-1",
    typeOperation: "ADHERENT_MODIFICATION",
    statut: "EN_ATTENTE_VALIDATION",
    elements: [element("el-1", "telephonePrincipal", "677000937", "699887766")],
  }),
  // Demande déjà approuvée, pour l'historique.
  demande({
    id: "dem-0",
    reference: "DV-000000",
    typeEntite: "ADHERENT",
    entiteId: "adh-1",
    typeOperation: "ADHERENT_VALIDATION_DOSSIER",
    statut: "APPROUVEE",
    demandeLe: "2025-01-10T08:00:00Z",
    examineePar: "u-dga-1",
    examineeLe: "2025-01-11T10:00:00Z",
    appliqueeLe: "2025-01-11T10:00:00Z",
    motif: "Création du dossier",
    commentaireValidateur: "Dossier vérifié et conforme.",
    elements: [element("el-0", "nom", null, "NDONGO")],
  }),
  // Changement de statut d'agent demandé par la DGA elle-même : elle ne peut pas le décider.
  demande({
    id: "dem-2",
    reference: "DV-000002",
    typeEntite: "AGENT",
    entiteId: "agent-1",
    typeOperation: "AGENT_CHANGEMENT_STATUT",
    statut: "EN_ATTENTE_VALIDATION",
    demandePar: "u-dga-1",
    demandeParIdentifiant: "dga.test",
    motif: "Départ en congé longue durée",
    elements: [element("el-2", "actif", "true", "false")],
  }),
];

let DECISIONS_TEST: Record<string, DecisionDemande[]> = {
  "dem-1": [
    {
      id: "dec-1",
      action: "SOUMISSION",
      statutAvant: "BROUILLON",
      statutApres: "EN_ATTENTE_VALIDATION",
      decidePar: "u-gc-1",
      decideParIdentifiant: "gestionnaire.test",
      decideLe: "2026-10-01T09:42:00Z",
      commentaire: null,
    },
  ],
};

let compteur = 10;

function utilisateurDe(request: Request) {
  const jeton = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/, "");
  return UTILISATEURS[jeton];
}

function erreur(code: string, message: string, statut: number) {
  return HttpResponse.json({ code, message, traceId: "t-wf", avertissements: [] }, { status: statut });
}

function enveloppe(contenu: readonly DemandeValidation[]) {
  return { contenu, page: 0, taille: 25, totalElements: contenu.length, totalPages: contenu.length > 0 ? 1 : 0, avertissements: [] };
}

function remplacer(maj: DemandeValidation, action: DecisionDemande["action"], par: string, commentaire: string | null, avant: StatutDemandeValidation) {
  DEMANDES_TEST = DEMANDES_TEST.map((d) => (d.id === maj.id ? maj : d));
  DECISIONS_TEST = {
    ...DECISIONS_TEST,
    [maj.id]: [
      ...(DECISIONS_TEST[maj.id] ?? []),
      {
        id: `dec-${compteur++}`,
        action,
        statutAvant: avant,
        statutApres: maj.statut,
        decidePar: par,
        decideParIdentifiant: par,
        decideLe: new Date().toISOString(),
        commentaire,
      },
    ],
  };
  return HttpResponse.json(maj);
}

/** Valeur officielle d'un champ, au format serveur, depuis les jeux de test. */
function valeurOfficielle(type: TypeEntiteWorkflow, id: string, champ: string): string | null {
  const source: Record<string, unknown> | undefined =
    type === "ADHERENT"
      ? (ADHERENTS_TEST.find((a) => a.id === id) as unknown as Record<string, unknown>)
      : type === "AGENT"
        ? (AGENTS_TEST.find((a) => a.id === id) as unknown as Record<string, unknown>)
        : (PAIEMENTS_TEST.find((p) => p.id === id) as unknown as Record<string, unknown>);
  const valeur = source?.[champ];
  return valeur === null || valeur === undefined ? null : String(valeur);
}

function creerDemande(
  request: Request,
  type: TypeEntiteWorkflow,
  entiteId: string,
  operation: TypeOperationWorkflow,
  motif: string,
  elements: readonly PropositionChamp[],
) {
  const utilisateur = utilisateurDe(request);
  if (!utilisateur) return erreur("AUTH_NON_AUTHENTIFIE", "Session invalide.", 401);
  if (DEMANDES_TEST.some((d) => d.entiteId === entiteId && STATUTS_DEMANDE_OUVERTS.includes(d.statut))) {
    return erreur("DEMANDE_ACTIVE_EXISTANTE", "Une demande est déjà en cours sur cette donnée.", 409);
  }
  const nouvelle = demande({
    id: `dem-${compteur++}`,
    reference: `DV-0000${compteur}`,
    typeEntite: type,
    entiteId,
    typeOperation: operation,
    statut: "EN_ATTENTE_VALIDATION",
    demandePar: utilisateur.id,
    demandeParIdentifiant: utilisateur.identifiant,
    demandeLe: new Date().toISOString(),
    soumiseLe: new Date().toISOString(),
    motif,
    elements: elements.map((e, i) => element(`el-n${i}`, e.champ, valeurOfficielle(type, entiteId, e.champ), e.valeurProposee)),
  });
  DEMANDES_TEST = [nouvelle, ...DEMANDES_TEST];
  return HttpResponse.json(nouvelle, { status: 201 });
}

const STATUT_BASE: Readonly<Record<TypeEntiteWorkflow, (id: string) => string | undefined>> = {
  ADHERENT: (id) => ADHERENTS_TEST.find((a) => a.id === id)?.statutValidation,
  AGENT: (id) => AGENTS_TEST.find((a) => a.id === id)?.statutValidation,
  PAIEMENT: (id) => PAIEMENTS_TEST.find((p) => p.id === id)?.statut,
};

function statutValidation(type: TypeEntiteWorkflow, id: string) {
  const ouverte = DEMANDES_TEST.find((d) => d.entiteId === id && STATUTS_DEMANDE_OUVERTS.includes(d.statut)) ?? null;
  const derniere = DEMANDES_TEST.find((d) => d.entiteId === id && !STATUTS_DEMANDE_OUVERTS.includes(d.statut)) ?? null;
  const base = STATUT_BASE[type](id) ?? "VALIDE";
  const statut =
    type === "PAIEMENT" ? base : ouverte?.statut === "CORRECTION_DEMANDEE" ? "CORRECTION_DEMANDEE" : ouverte?.typeOperation.endsWith("VALIDATION_DOSSIER") || ouverte?.typeOperation.endsWith("VALIDATION_PROFIL") ? "EN_ATTENTE_VALIDATION" : base;
  const modifiable = type === "PAIEMENT" ? base === "BROUILLON" : ["BROUILLON", "CORRECTION_DEMANDEE", "REJETE"].includes(statut);
  return HttpResponse.json({ typeEntite: type, entiteId: id, statutValidation: statut, version: 3, modifiableDirectement: modifiable, demandeOuverte: ouverte, derniereDemande: derniere });
}

function routesModule(racine: string, type: TypeEntiteWorkflow) {
  return [
    http.get(`/api/v1/${racine}/:id/statut-validation`, ({ params }) => statutValidation(type, String(params.id))),
    http.get(`/api/v1/${racine}/:id/historique-validation`, ({ params }) =>
      HttpResponse.json(DEMANDES_TEST.filter((d) => d.entiteId === params.id)),
    ),
  ];
}

const OPERATION_MODIFICATION: Readonly<Record<string, TypeOperationWorkflow>> = {
  adherents: "ADHERENT_MODIFICATION",
  agents: "AGENT_MODIFICATION",
};

export const handlersWorkflow = [
  ...routesModule("adherents", "ADHERENT"),
  ...routesModule("agents", "AGENT"),
  ...routesModule("paiements", "PAIEMENT"),

  ...(["adherents", "agents"] as const).flatMap((racine) => [
    http.post(`/api/v1/${racine}/:id/soumettre`, ({ params, request }) =>
      creerDemande(
        request,
        racine === "adherents" ? "ADHERENT" : "AGENT",
        String(params.id),
        racine === "adherents" ? "ADHERENT_VALIDATION_DOSSIER" : "AGENT_VALIDATION_PROFIL",
        "Soumission pour validation",
        [],
      ),
    ),
    http.post(`/api/v1/${racine}/:id/demandes-modification`, async ({ params, request }) => {
      const corps = (await request.json()) as { motif?: string; elements?: PropositionChamp[] };
      if (!corps.motif) return erreur("DEMANDE_MOTIF_REQUIS", "Le motif de la demande est obligatoire.", 400);
      return creerDemande(request, racine === "adherents" ? "ADHERENT" : "AGENT", String(params.id), OPERATION_MODIFICATION[racine]!, corps.motif, corps.elements ?? []);
    }),
  ]),

  http.post("/api/v1/agents/:id/demandes-changement-statut", async ({ params, request }) => {
    const corps = (await request.json()) as { actif: boolean; motif?: string };
    if (!corps.motif) return erreur("DEMANDE_MOTIF_REQUIS", "Le motif est obligatoire.", 400);
    return creerDemande(request, "AGENT", String(params.id), "AGENT_CHANGEMENT_STATUT", corps.motif, [
      { champ: "actif", valeurProposee: String(corps.actif) },
    ]);
  }),

  http.post("/api/v1/paiements/:id/demandes-correction", async ({ params, request }) => {
    const corps = (await request.json()) as { motif?: string; elements?: PropositionChamp[] };
    if (!corps.motif) return erreur("DEMANDE_MOTIF_REQUIS", "Le motif de la demande est obligatoire.", 400);
    const paiement = PAIEMENTS_TEST.find((p) => p.id === params.id);
    if (paiement?.statut === "BROUILLON") {
      return erreur("PAIEMENT_BROUILLON_MODIFIABLE", "Ce paiement est un brouillon : modifiez-le directement.", 409);
    }
    return creerDemande(request, "PAIEMENT", String(params.id), "PAIEMENT_CORRECTION", corps.motif, corps.elements ?? []);
  }),

  http.get("/api/v1/demandes-validation/en-attente", ({ request }) => {
    const utilisateur = utilisateurDe(request);
    // Comme l'API réelle : sans jeton, 401 (le client rafraîchit la session puis rejoue), jamais une file vide.
    if (!utilisateur) return erreur("AUTH_NON_AUTHENTIFIE", "Session invalide.", 401);
    const type = new URL(request.url).searchParams.get("typeEntite");
    const contenu = DEMANDES_TEST.filter(
      (d) =>
        d.statut === "EN_ATTENTE_VALIDATION" &&
        d.demandePar !== utilisateur?.id &&
        (utilisateur?.permissions ?? []).includes(PERMISSION_DECISION[d.typeOperation]) &&
        (!type || d.typeEntite === type),
    );
    return HttpResponse.json(enveloppe(contenu));
  }),

  http.get("/api/v1/demandes-validation", ({ request }) => {
    const utilisateur = utilisateurDe(request);
    if (!utilisateur) return erreur("AUTH_NON_AUTHENTIFIE", "Session invalide.", 401);
    const url = new URL(request.url);
    const statut = url.searchParams.get("statut");
    const type = url.searchParams.get("typeEntite");
    const mes = url.searchParams.get("mesDemandes") === "true";
    const contenu = DEMANDES_TEST.filter(
      (d) => (!statut || d.statut === statut) && (!type || d.typeEntite === type) && (!mes || d.demandePar === utilisateur?.id),
    );
    return HttpResponse.json(enveloppe(contenu));
  }),

  http.get("/api/v1/demandes-validation/:id/decisions", ({ params }) => HttpResponse.json(DECISIONS_TEST[String(params.id)] ?? [])),

  http.get("/api/v1/demandes-validation/:id", ({ params }) => {
    const trouvee = DEMANDES_TEST.find((d) => d.id === params.id);
    return trouvee ? HttpResponse.json(trouvee) : erreur("DEMANDE_INTROUVABLE", "Demande de validation introuvable.", 404);
  }),

  http.post("/api/v1/demandes-validation/:id/:action", async ({ params, request }) => {
    const cible = DEMANDES_TEST.find((d) => d.id === params.id);
    if (!cible) return erreur("DEMANDE_INTROUVABLE", "Demande de validation introuvable.", 404);
    const utilisateur = utilisateurDe(request);
    if (!utilisateur) return erreur("AUTH_NON_AUTHENTIFIE", "Session invalide.", 401);
    const texte = await request.text();
    const corps = (texte ? JSON.parse(texte) : {}) as { commentaire?: string; elements?: PropositionChamp[] };
    const action = String(params.action);
    const avant = cible.statut;

    if (["approuver", "rejeter", "demander-correction"].includes(action)) {
      if (cible.demandePar === utilisateur.id) {
        return erreur("DEMANDE_AUTO_VALIDATION_INTERDITE", "Vous ne pouvez pas décider de votre propre demande.", 403);
      }
      if (!utilisateur.permissions.includes(PERMISSION_DECISION[cible.typeOperation])) {
        return erreur("DEMANDE_VALIDATION_NON_AUTORISEE", "Vous n'êtes pas habilité à décider de cette demande.", 403);
      }
      if (cible.statut !== "EN_ATTENTE_VALIDATION") {
        return erreur("DEMANDE_TRANSITION_INTERDITE", "Cette demande n'est plus en attente de validation.", 409);
      }
      if (action !== "approuver" && !corps.commentaire) {
        return erreur("DEMANDE_MOTIF_REQUIS", "Le motif de la décision est obligatoire.", 400);
      }
      const statut: StatutDemandeValidation = action === "approuver" ? "APPROUVEE" : action === "rejeter" ? "REJETEE" : "CORRECTION_DEMANDEE";
      return remplacer(
        {
          ...cible,
          statut,
          examineePar: utilisateur.id,
          examineeLe: new Date().toISOString(),
          appliqueeLe: action === "approuver" ? new Date().toISOString() : null,
          commentaireValidateur: corps.commentaire ?? null,
        },
        action === "approuver" ? "APPROBATION" : action === "rejeter" ? "REJET" : "DEMANDE_CORRECTION",
        utilisateur.identifiant,
        corps.commentaire ?? null,
        avant,
      );
    }

    if (cible.demandePar !== utilisateur.id) {
      return erreur("DEMANDE_RESERVEE_DEMANDEUR", "Seul l'auteur de la demande peut effectuer cette action.", 403);
    }
    if (action === "resoumettre") {
      const elements = corps.elements
        ? cible.elements.map((e) => ({ ...e, valeurProposee: corps.elements!.find((p) => p.champ === e.champ)?.valeurProposee ?? e.valeurProposee }))
        : cible.elements;
      return remplacer({ ...cible, statut: "EN_ATTENTE_VALIDATION", elements }, "RESOUMISSION", utilisateur.identifiant, corps.commentaire ?? null, avant);
    }
    if (action === "annuler") {
      return remplacer({ ...cible, statut: "ANNULEE" }, "ANNULATION", utilisateur.identifiant, corps.commentaire ?? null, avant);
    }
    if (action === "soumettre") {
      return remplacer({ ...cible, statut: "EN_ATTENTE_VALIDATION" }, "SOUMISSION", utilisateur.identifiant, null, avant);
    }
    return erreur("DEMANDE_TRANSITION_INTERDITE", "Action inconnue.", 409);
  }),
];
