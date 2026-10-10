import { http, HttpResponse } from "msw";
import type { ParametreAdmin, RoleAdmin, UtilisateurAdmin } from "@/api/administration";

/**
 * Gestionnaires MSW pour l'administration (J11). Forme alignée sur les DTO backend
 * réels (`cm.cositi.api.administration.dto`).
 */

const UTILISATEURS: readonly UtilisateurAdmin[] = [
  {
    id: "u-admin-1",
    identifiant: "super.admin",
    nomComplet: "Admin Systeme",
    email: "admin@cositi.cm",
    telephone: null,
    actif: true,
    doitChangerMotDePasse: false,
    verrouille: false,
    verrouilleJusquA: null,
    derniereConnexionLe: "2026-09-23T07:30:00Z",
    roles: ["SUPER_ADMIN"],
    agentId: null,
  },
  {
    id: "u-agent-1",
    identifiant: "agent.test",
    nomComplet: "Ateba Jean",
    email: null,
    telephone: "677000001",
    actif: true,
    doitChangerMotDePasse: false,
    verrouille: true,
    verrouilleJusquA: "2026-09-23T12:00:00Z",
    derniereConnexionLe: "2026-09-22T16:05:00Z",
    roles: ["AGENT_TERRAIN"],
    agentId: "ag-1",
  },
  {
    id: "u-ancien-1",
    identifiant: "ancien.agent",
    nomComplet: "Mbarga Paul",
    email: null,
    telephone: null,
    actif: false,
    doitChangerMotDePasse: false,
    verrouille: false,
    verrouilleJusquA: null,
    derniereConnexionLe: "2026-06-01T09:00:00Z",
    roles: ["AGENT_TERRAIN"],
    agentId: null,
  },
];

const ROLES: readonly RoleAdmin[] = [
  {
    code: "SUPER_ADMIN",
    libelle: "Super Administrateur",
    description: "Administration système et sécurité",
    permissions: ["ADMINISTRATION:GERER", "ADMINISTRATION:LIRE", "AUDIT:CONSULTER"],
  },
  {
    code: "AGENT_TERRAIN",
    libelle: "Agent de terrain",
    description: "Opérations terrain et comptes rendus",
    permissions: ["ADHERENT:CREER", "ADHERENT:LIRE", "PAIEMENT:CREER"],
  },
];

const PARAMETRES: readonly ParametreAdmin[] = [
  {
    id: "par-1",
    cle: "DELAI_RETARD_JOURS",
    valeur: "30",
    typeValeur: "ENTIER",
    libelle: "Nombre de jours d'impayé qualifiant le statut EN_RETARD",
    modifiableParRole: "SUPER_ADMIN",
    statutValidation: "V",
    modifieLe: null,
    modifiePar: null,
  },
  {
    id: "par-2",
    cle: "MONTANT_INSCRIPTION",
    valeur: "1000",
    typeValeur: "DECIMAL",
    libelle: "Frais d'inscription coopérative unique en FCFA",
    modifiableParRole: "SUPER_ADMIN",
    statutValidation: "C",
    modifieLe: "2026-09-20T10:00:00Z",
    modifiePar: "super.admin",
  },
];

function enveloppe<T>(contenu: readonly T[]) {
  return { contenu, page: 0, taille: 25, totalElements: contenu.length, totalPages: 1, avertissements: [] };
}

export const handlersAdministration = [
  http.get("/api/v1/administration/utilisateurs", ({ request }) => {
    const recherche = new URL(request.url).searchParams.get("recherche");
    const contenu = recherche
      ? UTILISATEURS.filter(
          (u) =>
            u.identifiant.toLowerCase().includes(recherche.toLowerCase()) ||
            u.nomComplet.toLowerCase().includes(recherche.toLowerCase()),
        )
      : UTILISATEURS;
    return HttpResponse.json(enveloppe(contenu));
  }),

  http.post("/api/v1/administration/utilisateurs", async ({ request }) => {
    const corps = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        utilisateur: { ...UTILISATEURS[0], id: "u-nouveau", ...corps, doitChangerMotDePasse: true },
        // Révélé une seule fois, jamais relisible ensuite.
        motDePasseInitial: "Kp9!mZ2xQw7$Lb4T",
      },
      { status: 201 },
    );
  }),

  http.post("/api/v1/administration/utilisateurs/:id/activation", async ({ params, request }) => {
    const corps = (await request.json()) as { actif: boolean };
    const utilisateur = UTILISATEURS.find((u) => u.id === params.id) ?? UTILISATEURS[0]!;
    return HttpResponse.json({ ...utilisateur, actif: corps.actif });
  }),

  http.get("/api/v1/administration/roles", () => HttpResponse.json(ROLES)),

  http.get("/api/v1/administration/parametres", () => HttpResponse.json(PARAMETRES)),

  http.put("/api/v1/administration/parametres/:cle", async ({ params, request }) => {
    const corps = (await request.json()) as { valeur: string };
    const parametre = PARAMETRES.find((p) => p.cle === params.cle) ?? PARAMETRES[0]!;
    return HttpResponse.json({
      ...parametre,
      valeur: corps.valeur,
      modifieLe: "2026-09-23T11:00:00Z",
      modifiePar: "super.admin",
    });
  }),
];
