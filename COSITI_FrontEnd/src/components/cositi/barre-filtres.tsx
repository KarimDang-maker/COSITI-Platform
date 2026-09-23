import type { ReactNode } from "react";

interface BarreFiltresProps {
  children: ReactNode;
}

/**
 * Rangée de filtres alignée sur les paramètres de requête de l'API
 * (`docs/02_DESIGN_SYSTEM.md §9.1`). Ce composant ne porte que la mise en
 * page : la synchronisation avec l'URL et l'appel API vivent dans l'écran.
 */
export function BarreFiltres({ children }: BarreFiltresProps) {
  return <div className="flex flex-wrap items-end gap-3 rounded-lg border border-bordure bg-surface p-4">{children}</div>;
}
