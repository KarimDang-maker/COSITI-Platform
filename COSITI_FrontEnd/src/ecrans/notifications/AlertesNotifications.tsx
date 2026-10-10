import { useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useMarquerNotificationLue } from "@/hooks/useNotifications";
import {
  EVENEMENT_NOTIFICATION_RECUE,
  cheminNotification,
  libelleActionNotification,
  type Notification,
} from "@/api/notifications";

/** Assez long pour qu'une personne peu à l'aise avec l'écran ait le temps de lire et d'agir. */
const DUREE_ALERTE_MS = 15_000;

/**
 * Alerte affichée dès qu'une notification arrive par le flux temps réel (`EVENEMENT_NOTIFICATION_RECUE`, émis par
 * `hooks/useTempsReel.ts`). Le bouton d'action marque la notification lue et ouvre l'écran où y répondre
 * (`cheminNotification`) ; sans écran, l'alerte informe seulement. Placé sous le routeur : lui seul peut naviguer.
 * Sonner annonce l'alerte aux lecteurs d'écran (région `aria-live`).
 */
export function AlertesNotifications() {
  const navigate = useNavigate();
  const marquerLue = useMarquerNotificationLue();
  const { mutate: marquer } = marquerLue;

  useEffect(() => {
    function surNotification(evenement: Event) {
      const notification = (evenement as CustomEvent<Notification>).detail;
      const chemin = cheminNotification(notification);
      toast(notification.titre, {
        id: `notification-${notification.id}`,
        description: notification.corps,
        duration: DUREE_ALERTE_MS,
        action: chemin
          ? {
              label: libelleActionNotification(notification),
              onClick: () => {
                marquer(notification.id);
                navigate(chemin);
              },
            }
          : undefined,
      });
    }
    window.addEventListener(EVENEMENT_NOTIFICATION_RECUE, surNotification);
    return () => window.removeEventListener(EVENEMENT_NOTIFICATION_RECUE, surNotification);
  }, [navigate, marquer]);

  return null;
}
