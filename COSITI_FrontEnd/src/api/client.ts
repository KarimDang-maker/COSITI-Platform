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
  const estFormulaire = corps instanceof FormData;
  const enTetes: Record<string, string> = {
    Accept: "application/json",
    "X-Trace-Id": traceId,
    ...options.enTetes,
  };
  // Un `FormData` ne porte jamais de `Content-Type` fixé à la main : le navigateur doit générer
  // lui-même `multipart/form-data; boundary=…`. Le forcer casse l'analyse du corps côté serveur.
  if (corps !== undefined && !estFormulaire) enTetes["Content-Type"] = "application/json";
  if (options.authentifie !== false) {
    const jeton = obtenirJetonAcces();
    if (jeton) enTetes.Authorization = `Bearer ${jeton}`;
  }

  const reponse = await fetch(`${BASE_URL}${chemin}`, {
    method: methode,
    headers: enTetes,
    body: corps === undefined ? undefined : estFormulaire ? corps : JSON.stringify(corps),
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

interface OptionsTelechargement extends OptionsRequete {
  /** `GET` par défaut. `POST` pour un export, qui est une production journalisée et non une lecture. */
  methode?: "GET" | "POST";
}

/**
 * Fichier reçu du serveur. Le contenu reste un `Blob` en mémoire : rien n'est écrit sur disque tant que
 * l'utilisateur n'a pas cliqué (`04_SECURITE.md §4` côté API : aucun fichier laissé en clair après
 * téléchargement).
 */
export interface FichierRecu {
  readonly nomFichier: string;
  readonly typeMime: string;
  readonly contenu: Blob;
}

/**
 * Nom de fichier proposé par le serveur (`Content-Disposition: attachment; filename*=UTF-8''…`).
 * Une valeur absente ou illisible retombe sur un nom neutre — jamais sur une valeur inventée.
 */
function nomFichierDepuisEnTete(entete: string | null, defaut: string): string {
  if (!entete) return defaut;
  const encode = /filename\*=UTF-8''([^;]+)/i.exec(entete);
  if (encode?.[1]) {
    try {
      return decodeURIComponent(encode[1]);
    } catch {
      return defaut;
    }
  }
  const simple = /filename="?([^";]+)"?/i.exec(entete);
  return simple?.[1] ?? defaut;
}

/**
 * Téléchargement binaire (documents, exports). Passe par la même chaîne que les autres appels —
 * `Authorization`, `X-Trace-Id`, rotation du jeton sur 401, normalisation des erreurs — parce que
 * `AGENTS.md` interdit tout `fetch` direct hors de ce module.
 */
async function telechargerFichier(
  chemin: string,
  options: OptionsTelechargement = {},
  dejaTenteApresRafraichissement = false,
): Promise<FichierRecu> {
  const traceId = options.enTetes?.["X-Trace-Id"] ?? genererTraceId();
  const enTetes: Record<string, string> = { "X-Trace-Id": traceId, ...options.enTetes };
  const jeton = obtenirJetonAcces();
  if (jeton) enTetes.Authorization = `Bearer ${jeton}`;

  const reponse = await fetch(`${BASE_URL}${chemin}`, {
    // Les exports sont en `POST` (ils déclenchent une production journalisée), les documents en `GET`.
    method: options.methode ?? "GET",
    headers: enTetes,
    credentials: "include",
    signal: options.signal,
  });

  if (reponse.status === 401 && !dejaTenteApresRafraichissement) {
    const succes = await rafraichir();
    if (succes) return telechargerFichier(chemin, options, true);
    effacerJetonAcces();
    emettreSessionExpiree();
    throw await construireErreur(reponse, traceId);
  }

  if (!reponse.ok) throw await construireErreur(reponse, traceId);

  const contenu = await reponse.blob();
  return {
    nomFichier: nomFichierDepuisEnTete(reponse.headers.get("Content-Disposition"), "document"),
    typeMime: reponse.headers.get("Content-Type") ?? "application/octet-stream",
    contenu,
  };
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
  /** Envoi `multipart/form-data` (téléversement de document, jalon J7). */
  postFormulaire: <T>(chemin: string, formulaire: FormData, options: OptionsRequete = {}) =>
    executer<T>(chemin, "POST", formulaire, options),
  telechargerFichier,
  /**
   * Reprise de session au démarrage, via le cookie `HttpOnly` de rafraîchissement.
   *
   * Passe par le même verrou « un seul appel en vol » que la rotation déclenchée par un 401.
   * C'est indispensable et non cosmétique : le serveur fait tourner le jeton à chaque usage et
   * traite la réutilisation d'un jeton déjà consommé comme un vol probable — il révoque alors
   * **toute la famille**, y compris le jeton fraîchement émis. Deux rafraîchissements légitimes
   * lancés en parallèle (deux onglets restaurés ensemble, ou le double montage de `StrictMode`
   * en développement) déconnectaient donc l'utilisateur et inscrivaient une alerte de sécurité
   * infondée. Ne jamais appeler `POST /auth/rafraichir` directement.
   */
  rafraichirSession: rafraichir,
};

export type { OptionsRequete, OptionsTelechargement };
