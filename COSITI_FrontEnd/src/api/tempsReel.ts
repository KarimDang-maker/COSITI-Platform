/**
 * COSITI — Flux temps réel (`GET /temps-reel/flux`, Server-Sent Events).
 *
 * Le serveur pousse un **signal** après chaque action validée (commit) d'un acteur : domaine, identifiants et
 * nature du changement, jamais la donnée elle-même. Le client se contente de déclarer périmées les requêtes
 * concernées ; TanStack Query les recharge par l'API ordinaire, qui applique permissions et périmètre. Le flux
 * ne peut donc rien montrer que l'API refuserait (`AGENTS.md` règles 1 et 2).
 */
import { client, type MessageFlux } from "@/api/client";
import { lireNotificationPoussee, type Notification } from "@/api/notifications";

export type DomaineTempsReel =
  | "adherent"
  | "agent"
  | "paiement"
  | "bilan_caisse"
  | "workflow"
  | "adhesion";

export interface EvenementTempsReel {
  readonly domaine: DomaineTempsReel;
  readonly id: string | null;
  readonly adherentId: string | null;
  readonly typeChangement: string | null;
  readonly horodatage: string;
}

const DOMAINES: readonly DomaineTempsReel[] = [
  "adherent",
  "agent",
  "paiement",
  "bilan_caisse",
  "workflow",
  "adhesion",
];

/** Lit un message `changement` ; tout autre message, ou un contenu illisible, est ignoré. */
export function lireEvenementTempsReel(message: MessageFlux): EvenementTempsReel | null {
  if (message.evenement !== "changement") return null;
  try {
    const brut: unknown = JSON.parse(message.donnees);
    if (typeof brut !== "object" || brut === null) return null;
    const domaine = (brut as Record<string, unknown>).domaine;
    if (typeof domaine !== "string" || !DOMAINES.includes(domaine as DomaineTempsReel)) return null;
    return brut as EvenementTempsReel;
  } catch {
    return null;
  }
}

/**
 * Ouvre le flux ; se résout à sa fermeture normale (expiration serveur), rejette sur erreur. Deux sortes de
 * messages : `changement` (signal sans donnée, à tous les lecteurs du domaine) et `notification` (la notification
 * elle-même, envoyée à son seul destinataire).
 */
export function ecouterChangements(
  surEvenement: (evenement: EvenementTempsReel) => void,
  signal: AbortSignal,
  surNotification?: (notification: Notification) => void,
): Promise<void> {
  return client.ecouterFlux(
    "/temps-reel/flux",
    (message) => {
      if (message.evenement === "notification") {
        const notification = lireNotificationPoussee(message.donnees);
        if (notification) surNotification?.(notification);
        return;
      }
      const evenement = lireEvenementTempsReel(message);
      if (evenement) surEvenement(evenement);
    },
    { signal },
  );
}

/**
 * Familles de requêtes à recharger pour chaque domaine. Large à dessein : une cotisation validée change aussi
 * les droits, les tableaux de bord et le bilan de caisse. Seules les requêtes affichées à l'écran sont
 * rechargées immédiatement ; les autres sont marquées périmées et rechargées à leur prochain affichage.
 */
export const CLES_PAR_DOMAINE: Record<DomaineTempsReel, readonly string[]> = {
  adherent: ["adherents", "adhesion", "cnps", "droits", "documents", "tableaux-de-bord", "organisation"],
  agent: ["organisation", "tableaux-de-bord", "adherents"],
  paiement: ["paiements", "bilans-caisse", "droits", "adherents", "tableaux-de-bord", "rapports-daf", "organisation"],
  bilan_caisse: ["bilans-caisse", "tableaux-de-bord", "rapports-daf"],
  workflow: ["workflow", "notifications", "adherents", "organisation", "paiements"],
  adhesion: ["adhesion", "adherents", "notifications", "tableaux-de-bord", "organisation"],
};
