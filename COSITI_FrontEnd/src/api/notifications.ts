/**
 * COSITI — Domaine « Notifications » (J8).
 *
 * Aucune création côté client : une notification est la conséquence d'une
 * opération métier (compte rendu transmis, écart de caisse détecté), jamais un
 * objet qu'un utilisateur dépose. L'API n'expose que la lecture de ses propres
 * notifications et le marquage « lue ».
 */
import { client } from "@/api/client";
import type { EnveloppeListe } from "@/api/pagination";

export interface Notification {
  readonly id: string;
  readonly type: string;
  readonly titre: string;
  readonly corps: string;
  readonly entite: string | null;
  readonly entiteId: string | null;
  readonly lue: boolean;
  readonly creeLe: string;
}

/**
 * Écran où agir sur l'objet notifié, ou `null` si aucun écran ne l'affiche. Table explicite plutôt qu'une URL
 * construite à partir du nom de table : un lien mort est pire qu'une absence de lien. Les objets sans écran propre
 * (frais d'adhésion, bilan de caisse) passent par une route d'ouverture qui les résout puis redirige.
 *
 * Valeurs de `entite` relevées dans le backend (`ServiceNotification.notifier*`) : `demande_validation`,
 * `controle_dga`, `frais_adhesion`, `paiement`, `bilan_caisse`, `remise_caisse`, `compte_rendu`, `rapport_daf`.
 */
export function cheminNotification(notification: Notification): string | null {
  const id = notification.entiteId;
  // Délai de dépôt CNPS (entité `adherent`) : on ouvre l'onglet CNPS de la fiche, où se trouve le parcours et l'action.
  if (notification.type === "CNPS_DELAI_DEPOT" && id) return `/adherents/${id}?onglet=cnps`;
  switch (notification.entite) {
    case "demande_validation":
      return id ? `/validations/${id}` : "/validations";
    case "controle_dga":
      return id ? `/controles-dga/${id}` : "/controles-dga";
    case "frais_adhesion":
      return id ? `/frais-adhesion/${id}` : "/frais-adhesion";
    case "paiement":
      return id ? `/cotisations/${id}` : "/cotisations";
    case "bilan_caisse":
      return id ? `/bilans-caisse/ouvrir/${id}` : "/bilans-caisse";
    case "remise_caisse":
      return "/daf";
    case "compte_rendu":
      return id ? `/comptes-rendus/${id}` : "/comptes-rendus";
    case "rapport_daf":
      return "/rapports";
    case "adherent":
      return id ? `/adherents/${id}` : "/adherents";
    case "agent":
      return id ? `/agents/${id}` : "/agents";
    default:
      return null;
  }
}

/**
 * Libellé du bouton d'action : ce que le destinataire va faire en ouvrant la notification. Par `type` (code
 * fonctionnel du backend), sinon par objet. Ce n'est qu'un libellé : l'écran ouvert décide des actions permises.
 */
export function libelleActionNotification(notification: Notification): string {
  switch (notification.type) {
    case "DEMANDE_VALIDATION_A_TRAITER":
      return "Traiter la demande";
    case "DEMANDE_VALIDATION_CORRECTION":
      return "Corriger la demande";
    case "CONTROLE_DGA_A_TRAITER":
      return "Contrôler le dossier";
    case "CONTROLE_DGA_CORRECTION":
      return "Corriger le dossier";
    case "FRAIS_ADHESION_ECART":
    case "FRAIS_ADHESION_ANOMALIE":
      return "Traiter le frais";
    case "BILAN_CAISSE_ECART":
      return "Examiner le bilan";
    case "BILAN_CAISSE_ANOMALIE":
      return "Recompter la caisse";
    case "REMISE_CAISSE_ECART":
      return "Examiner la remise";
    case "CNPS_DELAI_DEPOT":
      return "Voir le parcours CNPS";
    case "COMPTE_RENDU_TERRAIN":
    case "COMPTE_RENDU_CONSOLIDE":
      return "Examiner le compte rendu";
    default:
      return "Ouvrir";
  }
}

/** Nom de l'évènement DOM émis par le flux temps réel à l'arrivée d'une notification (`hooks/useTempsReel.ts`). */
export const EVENEMENT_NOTIFICATION_RECUE = "cositi:notification-recue";

/** Lit une notification poussée par le flux ; `null` si le contenu n'a pas la forme attendue. */
export function lireNotificationPoussee(donnees: string): Notification | null {
  try {
    const brut: unknown = JSON.parse(donnees);
    if (typeof brut !== "object" || brut === null) return null;
    const n = brut as Record<string, unknown>;
    if (typeof n.id !== "string" || typeof n.titre !== "string") return null;
    return brut as Notification;
  } catch {
    return null;
  }
}

export function listerNotifications(filtres: { seulementNonLues?: boolean; page?: number; taille?: number }) {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur === undefined || valeur === null) continue;
    requete.set(cle, String(valeur));
  }
  const texte = requete.toString();
  return client.get<EnveloppeListe<Notification>>(`/notifications${texte ? `?${texte}` : ""}`);
}

export function compterNonLues() {
  return client.get<{ nonLues: number }>("/notifications/non-lues/compte");
}

export function marquerNotificationLue(id: string) {
  return client.post<Notification>(`/notifications/${id}/lue`, undefined);
}
