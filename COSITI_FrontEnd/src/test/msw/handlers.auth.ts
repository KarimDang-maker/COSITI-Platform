import { http, HttpResponse } from "msw";
import { JETON_AGENT, UTILISATEURS } from "@/test/msw/donnees";

interface CorpsConnexion {
  identifiant: string;
  motDePasse: string;
}

const COMPTES: Readonly<Record<string, { motDePasse: string; jeton: string; doitChangerMotDePasse?: boolean }>> = {
  "agent.test": { motDePasse: "MotDePasse#1", jeton: JETON_AGENT },
  "gestionnaire.test": { motDePasse: "MotDePasse#1", jeton: "jeton-gestionnaire-comptes" },
  "dga.test": { motDePasse: "MotDePasse#1", jeton: "jeton-dga" },
  "daf.test": { motDePasse: "MotDePasse#1", jeton: "jeton-daf" },
  "primo.test": { motDePasse: "MotDePasse#1", jeton: JETON_AGENT, doitChangerMotDePasse: true },
};

export const handlersAuth = [
  http.post("/api/v1/auth/connexion", async ({ request }) => {
    const corps = (await request.json()) as CorpsConnexion;

    if (corps.identifiant === "verrouille.test") {
      return HttpResponse.json(
        {
          code: "AUTH_TROP_DE_TENTATIVES",
          message: "Trop de tentatives. Réessayez plus tard.",
          traceId: "trace-verrouille",
          avertissements: [],
        },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    }

    const compte = COMPTES[corps.identifiant];
    if (!compte || compte.motDePasse !== corps.motDePasse) {
      return HttpResponse.json(
        {
          code: "AUTH_IDENTIFIANTS_INVALIDES",
          message: "Identifiant ou mot de passe incorrect.",
          traceId: "trace-connexion-echec",
          avertissements: [],
        },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      jetonAcces: compte.jeton,
      doitChangerMotDePasse: compte.doitChangerMotDePasse ?? false,
    });
  }),

  http.post("/api/v1/auth/rafraichir", () => {
    // Par défaut : aucune session à reprendre (pas de cookie de rafraîchissement
    // valide en environnement de test). Un test qui a besoin d'une session déjà
    // active au montage surcharge ce gestionnaire avec `serveur.use(...)`.
    return HttpResponse.json(
      { code: "AUTH_SESSION_ABSENTE", message: "Aucune session à reprendre.", traceId: "trace-rafraichir", avertissements: [] },
      { status: 401 },
    );
  }),

  http.post("/api/v1/auth/deconnexion", () => new HttpResponse(null, { status: 204 })),

  http.post("/api/v1/auth/mot-de-passe/changer", () => new HttpResponse(null, { status: 204 })),

  http.get("/api/v1/auth/moi", ({ request }) => {
    const authorization = request.headers.get("Authorization") ?? "";
    const jeton = authorization.replace(/^Bearer\s+/, "");
    const utilisateur = UTILISATEURS[jeton];
    if (!utilisateur) {
      return HttpResponse.json(
        { code: "AUTH_NON_AUTHENTIFIE", message: "Session invalide.", traceId: "trace-moi", avertissements: [] },
        { status: 401 },
      );
    }
    return HttpResponse.json(utilisateur);
  }),
];
