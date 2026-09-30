/**
 * COSITI — Forme normalisée d'une erreur API.
 *
 * Toute réponse HTTP en échec de `api/client.ts` est convertie vers cette
 * forme unique, quel que soit l'endpoint. Un écran n'inspecte jamais un code
 * HTTP ni une structure de réponse brute : il lit `ErreurApi`.
 *
 * `avertissements` porte les règles `[V]` non validées associées à la
 * réponse (voir `docs/02_DESIGN_SYSTEM.md §10`) : un écran qui reçoit une
 * erreur avec des avertissements les affiche quand même, ils ne sont jamais
 * perdus au profit du seul message d'erreur.
 */
export interface ErreurApi {
  /** Code métier stable, ex. `PAIEMENT_REFERENCE_MANQUANTE`. Jamais affiché tel quel à l'utilisateur. */
  readonly code: string;
  /** Message déjà en français, prêt à afficher (`03_SPECIFICATIONS_API.md §1`). */
  readonly message: string;
  /** Champ de formulaire concerné, si l'erreur est localisable (ex. `referenceTransaction`). */
  readonly champ?: string;
  /** Identifiant de corrélation — jamais affiché à l'utilisateur final, utile au support. */
  readonly traceId: string;
  /** Règles `[V]` en jeu dans la réponse, même en cas d'erreur. */
  readonly avertissements: readonly string[];
  /** Statut HTTP d'origine — sert à orienter le comportement (409, 429…), jamais affiché. */
  readonly statut: number;
  /** Champs additionnels renvoyés par l'API pour ce code précis (ex. `candidats` d'un doublon). */
  readonly details?: Readonly<Record<string, unknown>>;
}

const CLES_CONNUES = new Set(["code", "message", "champ", "traceId", "avertissements"]);

const MESSAGES_PAR_STATUT: Readonly<Record<number, string>> = {
  400: "La demande n'a pas pu être traitée : certaines informations sont invalides.",
  401: "Votre session a expiré. Reconnectez-vous pour continuer.",
  403: "Vous n'avez pas l'autorisation nécessaire pour cette action.",
  404: "L'élément demandé est introuvable.",
  409: "Cette action entre en conflit avec une donnée existante.",
  422: "La demande n'a pas pu être traitée : certaines informations sont invalides.",
  429: "Trop de demandes ont été envoyées. Réessayez dans quelques instants.",
  500: "Une erreur technique est survenue. Réessayez, et signalez le problème si cela persiste.",
};

function messageParDefaut(statut: number): string {
  return MESSAGES_PAR_STATUT[statut] ?? "Une erreur inattendue est survenue.";
}

/**
 * Construit une `ErreurApi` à partir du corps de réponse (déjà parsé en JSON,
 * ou `undefined` si le corps était vide ou illisible) et des métadonnées HTTP.
 * Ne lève jamais : une réponse d'erreur mal formée devient une erreur générique
 * plutôt que de casser l'écran appelant.
 */
export function normaliserErreurApi(
  corps: unknown,
  statut: number,
  traceIdEnvoye: string,
): ErreurApi {
  const objet = typeof corps === "object" && corps !== null ? (corps as Record<string, unknown>) : {};

  const code = typeof objet.code === "string" ? objet.code : `HTTP_${statut}`;
  const message = typeof objet.message === "string" && objet.message.trim() !== ""
    ? objet.message
    : messageParDefaut(statut);
  const champ = typeof objet.champ === "string" ? objet.champ : undefined;
  const traceId = typeof objet.traceId === "string" ? objet.traceId : traceIdEnvoye;
  const avertissements = Array.isArray(objet.avertissements)
    ? objet.avertissements.filter((a): a is string => typeof a === "string")
    : [];

  const details: Record<string, unknown> = {};
  for (const cle of Object.keys(objet)) {
    if (!CLES_CONNUES.has(cle)) details[cle] = objet[cle];
  }

  return {
    code,
    message,
    champ,
    traceId,
    avertissements,
    statut,
    details: Object.keys(details).length > 0 ? details : undefined,
  };
}

/** Permet `throw` / `catch (e)` tout en conservant la forme `ErreurApi`. */
export class ErreurApiException extends Error implements ErreurApi {
  readonly code: string;
  readonly champ?: string;
  readonly traceId: string;
  readonly avertissements: readonly string[];
  readonly statut: number;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(erreur: ErreurApi) {
    super(erreur.message);
    this.name = "ErreurApiException";
    this.code = erreur.code;
    this.champ = erreur.champ;
    this.traceId = erreur.traceId;
    this.avertissements = erreur.avertissements;
    this.statut = erreur.statut;
    this.details = erreur.details;
  }
}

/** Garde de type utilisée par les écrans pour distinguer une `ErreurApi` d'une autre erreur JS. */
export function estErreurApi(valeur: unknown): valeur is ErreurApi {
  return (
    typeof valeur === "object" &&
    valeur !== null &&
    "code" in valeur &&
    "message" in valeur &&
    "traceId" in valeur &&
    "statut" in valeur
  );
}
