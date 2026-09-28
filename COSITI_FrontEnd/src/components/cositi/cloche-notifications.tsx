import { Bell } from "lucide-react";
import { useNavigate } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompteNonLues, useMarquerNotificationLue, useNotifications } from "@/hooks/useNotifications";
import { cheminNotification, type Notification } from "@/api/notifications";
import { formaterDateHeure } from "@/lib/format";

/**
 * Cloche de notifications de l'en-tête (J8).
 *
 * Une notification arrive d'une action faite par quelqu'un d'autre — un compte
 * rendu transmis, un écart de caisse constaté. Le compteur est donc rafraîchi
 * périodiquement (voir `useCompteNonLues`), mais volontairement sans temps
 * réel : la connexion terrain est lente et ce n'est pas une donnée critique.
 *
 * Ouvrir une notification la marque lue et navigue vers l'objet concerné quand
 * un écran existe pour lui ; sinon elle est seulement marquée lue, plutôt que
 * de mener à un lien mort.
 */
export function ClocheNotifications() {
  const navigate = useNavigate();
  const { data: compte } = useCompteNonLues();
  const { data: notifications } = useNotifications({ taille: 10 });
  const marquerLue = useMarquerNotificationLue();

  const nonLues = compte?.nonLues ?? 0;
  const liste = notifications?.contenu ?? [];

  function ouvrir(notification: Notification) {
    if (!notification.lue) {
      marquerLue.mutate(notification.id);
    }
    const chemin = cheminNotification(notification);
    if (chemin) navigate(chemin);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative rounded-md p-2 outline-none hover:bg-surface-survol focus-visible:ring-2 focus-visible:ring-anneau"
        aria-label={nonLues > 0 ? `Notifications, ${nonLues} non lues` : "Notifications"}
      >
        <Bell className="size-5 text-texte-doux" aria-hidden="true" />
        {nonLues > 0 && (
          // Le nombre est écrit, pas seulement signalé par une pastille colorée :
          // la couleur ne porte jamais l'information seule (`docs/02_DESIGN_SYSTEM.md`).
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-danger-contenu">
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>
          {nonLues > 0 ? `${nonLues} notification(s) non lue(s)` : "Notifications"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {liste.length === 0 && (
          <p className="px-2 py-3 text-sm text-texte-doux">Aucune notification.</p>
        )}

        {liste.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            className="flex-col items-start gap-0.5"
            onSelect={() => ouvrir(notification)}
          >
            <span className={notification.lue ? "text-texte-doux" : "font-semibold text-texte"}>
              {notification.titre}
            </span>
            <span className="text-xs text-texte-doux">{notification.corps}</span>
            <span className="text-xs text-texte-inactif">{formaterDateHeure(notification.creeLe)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
