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
 * Chemin d'écran correspondant à l'objet notifié, ou `null` si aucun écran ne
 * l'affiche encore. Table explicite plutôt qu'une construction d'URL à partir
 * du nom de table : un lien mort est pire qu'une absence de lien.
 */
export function cheminNotification(notification: Notification): string | null {
  if (!notification.entiteId) return null;
  switch (notification.entite) {
    case "compte_rendu":
      return `/comptes-rendus/${notification.entiteId}`;
    case "remise_caisse":
      return "/daf";
    case "paiement":
      return `/cotisations/${notification.entiteId}`;
    default:
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
