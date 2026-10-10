/**
 * COSITI — Types du profil authentifié.
 *
 * Reflètent la réponse de `GET /auth/moi` (`03_SPECIFICATIONS_API.md §2`) :
 * « la liste des codes de permission, jamais un booléen par écran ». Aucun
 * rôle n'est codé en dur ici pour décider d'un affichage — voir
 * `ContexteAuth.tsx` : `usePermission` ne lit que `permissions`.
 */

/**
 * Les huit rôles fermés de la V1 (`Roles des acteurs.md §16` : aucun autre
 * rôle n'existe). Codes alignés sur `COSITI_Backend/src/main/resources/db/migration/V1__socle_securite.sql`
 * (source faisant foi pour l'orthographe exacte des codes de rôle).
 */
export type CodeRole =
  | "PCA"
  | "DG"
  | "DGA"
  | "DAF"
  | "GESTIONNAIRE_COMPTE"
  | "CHEF_AGENT_TERRAIN"
  | "AGENT_TERRAIN"
  | "SUPER_ADMIN";

/**
 * Code de permission tel que renvoyé par l'API, ex. `ADHERENT:LIRE`,
 * `PAIEMENT:VALIDER`. Type ouvert (`string`) : la liste vit côté serveur,
 * le frontend ne maintient pas d'énumération fermée qui daterait.
 */
export type CodePermission = string;

export interface Utilisateur {
  readonly id: string;
  readonly identifiant: string;
  readonly nomComplet: string;
  readonly roles: readonly CodeRole[];
  readonly permissions: readonly CodePermission[];
  /** Périmètre de données effectif (ex. zone, portefeuille) — affichage seulement, jamais un filtre recalculé côté client. */
  readonly perimetre?: Readonly<Record<string, unknown>>;
  readonly doitChangerMotDePasse: boolean;
}

export interface ReponseConnexion {
  readonly jetonAcces: string;
  readonly doitChangerMotDePasse: boolean;
}
