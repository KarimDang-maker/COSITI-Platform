import { Bell, BellRing } from "lucide-react";
import { useNavigate } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BoutonEntete } from "@/components/cositi/bouton-entete";
import { useCompteNonLues, useMarquerNotificationLue, useNotifications } from "@/hooks/useNotifications";
import { cheminNotification, type Notification } from "@/api/notifications";
import { formaterDateHeure } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Cloche de notifications de l'en-tête (J8), au format du gabarit : en-tête
 * de panneau, liste à pastilles, point « non lue ».
 *
 * Une notification arrive d'une action faite par quelqu'un d'autre — un compte
 * rendu transmis, un écart de caisse constaté. Le compteur est donc rafraîchi
 * périodiquement (voir `useCompteNonLues`), mais volontairement sans temps
 * réel : la connexion terrain est lente et ce n'est pas une donnée critique.
 *
 * Ouvrir une notification la marque lue et navigue vers l'objet concerné quand
 * un écran existe pour lui ; sinon elle est seulement marquée lue, plutôt que
 * de mener à un lien mort. Aucun lien « Voir toutes » : aucun écran de liste
 * complète n'est spécifié.
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
      <DropdownMenuTrigger asChild>
        <BoutonEntete aria-label={nonLues > 0 ? `Notifications, ${nonLues} non lues` : "Notifications"}>
          <Bell aria-hidden="true" />
          {nonLues > 0 && (
            // Le nombre est écrit, pas seulement signalé par une pastille colorée :
            // la couleur ne porte jamais l'information seule (`docs/02_DESIGN_SYSTEM.md`).
            <span
              aria-hidden="true"
              className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full border-2 border-surface bg-danger-fort px-1 text-center text-2xs leading-4 font-bold text-surface"
            >
              {nonLues > 9 ? "9+" : nonLues}
            </span>
          )}
        </BoutonEntete>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-88 max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between gap-3 border-b border-bordure px-5 py-4">
          <p className="font-bold text-texte">Notifications</p>
          {nonLues > 0 && (
            <span className="rounded-full bg-primaire-doux px-2.5 py-0.5 text-2xs leading-5 font-bold text-succes-fort">
              {nonLues} non lue{nonLues > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {liste.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-texte-doux">Aucune notification.</p>
        )}

        {liste.length > 0 && (
          <div className="max-h-80 overflow-y-auto p-1.5">
            {liste.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="items-start gap-3 rounded-lg px-3.5 py-3"
                onSelect={() => ouvrir(notification)}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    notification.lue ? "bg-neutre-doux text-neutre-fort" : "bg-surface-inversee text-surface-inversee-accent",
                  )}
                >
                  <BellRing className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className={cn("block", notification.lue ? "text-texte-doux-fort" : "font-bold text-texte")}>
                    {notification.titre}
                  </span>
                  <span className="block text-xs text-texte-doux">{notification.corps}</span>
                  <span className="block text-2xs text-texte-doux">{formaterDateHeure(notification.creeLe)}</span>
                </span>
                {!notification.lue && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-marque" aria-hidden="true" />
                )}
                {!notification.lue && <span className="sr-only">Non lue</span>}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
