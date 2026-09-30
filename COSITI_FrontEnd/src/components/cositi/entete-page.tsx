import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FilAriane, type MaillonAriane } from "@/components/cositi/fil-ariane";

interface EnTetePageProps {
  /** Porté par l'unique `h1` de l'écran (`docs/02_DESIGN_SYSTEM.md §6`). */
  titre: ReactNode;
  /** Une phrase qui dit à quoi sert l'écran. */
  description?: ReactNode;
  /** Élément accolé au titre : `BadgeStatut` d'une fiche, par exemple. */
  statut?: ReactNode;
  filAriane?: readonly MaillonAriane[];
  /** Actions de l'écran, alignées à droite. Une seule en `default` (§1 règle 4). */
  actions?: ReactNode;
  className?: string;
}

/**
 * En-tête de page du gabarit : fil d'Ariane, titre, sous-titre à gauche ;
 * actions de l'écran à droite, qui passent sous le titre en écran étroit.
 */
export function EnTetePage({ titre, description, statut, filAriane, actions, className }: EnTetePageProps) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0 space-y-2">
        {filAriane && <FilAriane maillons={filAriane} />}
        <div className="flex flex-wrap items-center gap-3">
          <h1>{titre}</h1>
          {statut}
        </div>
        {description && <p className="max-w-3xl text-texte-doux-fort">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
