/**
 * COSITI — Instance HTTP unique.
 *
 * RÈGLE ABSOLUE (`AGENTS.md` : « une seule instance HTTP, aucun `fetch`
 * direct ailleurs »). Tout accès réseau de l'application passe par
 * `client.get/post/put/del` exportés d'ici. Rôles :
 *
 *  - ajoute `Authorization: Bearer <jeton>` depuis le jeton en mémoire
 *    (`auth/jeton.ts`) — jamais depuis `localStorage` ;
 *  - ajoute `X-Trace-Id`, généré si l'appelant n'en fournit pas
 *    (`03_SPECIFICATIONS_API.md §1`) ;
 *  - sur `401` : tente **une** rotation via `POST /auth/rafraichir` (cookie
 *    `HttpOnly`, `credentials: "include"`), rejoue la requête initiale une
 *    fois ; si la rotation échoue, efface le jeton et émet l'évènement de
 *    session expirée — `ContexteAuth` s'en charge, ce module ne redirige
 *    jamais lui-même (pas de dépendance au routeur ici) ;
 *  - sur `403`, `409`, `429` et toute autre erreur : normalise le corps en
 *    `ErreurApi` (`api/erreurs.ts`) et le lève — l'écran appelant décide de
 *    l'affichage (bandeau, champ de formulaire, dialogue de doublon…) ;
 *  - ne calcule et n'interprète jamais une règle métier : il transporte.
 */
import {
  definirJetonAcces,
  effacerJetonAcces,
  emettreSessionExpiree,
  obtenirJetonAcces,
} from "@/auth/jeton";
import { ErreurApiException, normaliserErreurApi } from "@/api/erreurs";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api/v1";

interface OptionsRequete {
  /** En-têtes additionnels ; fusionnés après les en-têtes par défaut. */
  enTetes?: Record<string, string>;
  signal?: AbortSignal;
  /** `false` pour un appel public (ex. `/auth/connexion`) : aucun `Authorization` ajouté. */
  authentifie?: boolean;
}

function genererTraceId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function lireCorpsErreur(reponse: Response): Promise<unknown> {
  try {
    const texte = await reponse.text();
    return texte ? JSON.parse(texte) : undefined;
  } catch {
    return undefined;
  }
}

async function construireErreur(reponse: Response, traceId: string): Promise<ErreurApiException> {
  const corps = await lireCorpsErreur(reponse);
  const erreur = normaliserErreurApi(corps, reponse.status, traceId);
  if (reponse.status === 429) {
    const retryAfter = reponse.headers.get("Retry-After");
    return new ErreurApiException({
      ...erreur,
      details: { ...erreur.details, retryAfter: retryAfter ?? undefined },
    });
  }
  return new ErreurApiException(erreur);
}

let rafraichissementEnCours: Promise<boolean> | null = null;

interface ReponseRafraichissement {
  jetonAcces: string;
}

function estReponseRafraichissement(valeur: unknown): valeur is ReponseRafraichissement {
  return (
    typeof valeur === "object" &&
    valeur !== null &&
    typeof (valeur as Record<string, unknown>).jetonAcces === "string"
  );
}

/** Rotation du jeton d'accès via le cookie `HttpOnly` de rafraîchissement. Un seul appel en vol à la fois. */
async function rafraichir(): Promise<boolean> {
  if (!rafraichissementEnCours) {
    rafraichissementEnCours = (async () => {
      try {
        const reponse = await fetch(`${BASE_URL}/auth/rafraichir`, {
          method: "POST",
          credentials: "include",
          headers: { "X-Trace-Id": genererTraceId() },
        });
        if (!reponse.ok) return false;
        const corps: unknown = await reponse.json().catch(() => undefined);
        if (!estReponseRafraichissement(corps)) return false;
        definirJetonAcces(corps.jetonAcces);
        return true;
      } catch {
        return false;
      } finally {
        rafraichissementEnCours = null;
      }
    })();
  }
  return rafraichissementEnCours;
}

async function executer<T>(
  chemin: string,
  methode: string,
  corps: unknown,
  options: OptionsRequete,
  dejaTenteApresRafraichissement = false,
): Promise<T> {
  const traceId = options.enTetes?.["X-Trace-Id"] ?? genererTraceId();
  const enTetes: Record<string, string> = {
    Accept: "application/json",
    "X-Trace-Id": traceId,
    ...options.enTetes,
  };
  if (corps !== undefined) enTetes["Content-Type"] = "application/json";
  if (options.authentifie !== false) {
    const jeton = obtenirJetonAcces();
    if (jeton) enTetes.Authorization = `Bearer ${jeton}`;
  }

  const reponse = await fetch(`${BASE_URL}${chemin}`, {
    method: methode,
    headers: enTetes,
    body: corps !== undefined ? JSON.stringify(corps) : undefined,
    credentials: "include",
    signal: options.signal,
  });

  if (reponse.status === 401 && options.authentifie !== false && !dejaTenteApresRafraichissement) {
    const succes = await rafraichir();
    if (succes) return executer<T>(chemin, methode, corps, options, true);
    effacerJetonAcces();
    emettreSessionExpiree();
    throw await construireErreur(reponse, traceId);
  }

  if (!reponse.ok) throw await construireErreur(reponse, traceId);

  if (reponse.status === 204) return undefined as T;
  const texte = await reponse.text();
  return (texte ? (JSON.parse(texte) as T) : (undefined as T));
}

export const client = {
  get: <T>(chemin: string, options: OptionsRequete = {}) =>
    executer<T>(chemin, "GET", undefined, options),
  post: <T>(chemin: string, corps?: unknown, options: OptionsRequete = {}) =>
    executer<T>(chemin, "POST", corps, options),
  put: <T>(chemin: string, corps?: unknown, options: OptionsRequete = {}) =>
    executer<T>(chemin, "PUT", corps, options),
  del: <T>(chemin: string, options: OptionsRequete = {}) =>
    executer<T>(chemin, "DELETE", undefined, options),
};

export type { OptionsRequete };
