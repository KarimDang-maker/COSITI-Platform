import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BarreFiltresProps {
  children: ReactNode;
  /** Actions alignées à droite de la barre (export, réinitialisation). */
  actions?: ReactNode;
  /**
   * `true` quand la barre est posée dans `TableauDonnees barreOutils` : la
   * carte est déjà fournie par le tableau.
   */
  integree?: boolean;
}

/**
 * Rangée de filtres alignée sur les paramètres de requête de l'API
 * (`docs/02_DESIGN_SYSTEM.md §9.1`, gabarit : `table-header-control`). Ce
 * composant ne porte que la mise en page : la synchronisation avec l'URL et
 * l'appel API vivent dans l'écran.
 */
export function BarreFiltres({ children, actions, integree = false }: BarreFiltresProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        !integree && "rounded-xl bg-surface p-5 shadow-carte",
        integree && "w-full",
      )}
    >
      <div className="flex flex-wrap items-end gap-4">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
