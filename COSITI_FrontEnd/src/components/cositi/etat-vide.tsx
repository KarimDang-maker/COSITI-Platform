import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EtatVideProps {
  titre: string;
  description?: string;
  action?: ReactNode;
  /** Icône du domaine concerné (`Users` pour une liste d'adhérents…). */
  icone?: LucideIcon;
  className?: string;
}

/**
 * Message explicite + action possible. Jamais un tableau vide sans explication
 * (`docs/02_DESIGN_SYSTEM.md §9.1`). Gabarit : grande icône atténuée dans une
 * pastille, titre, texte d'aide, action.
 */
export function EtatVide({ titre, description, action, icone: Icone = Inbox, className }: EtatVideProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-bordure-forte bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-1 flex size-14 items-center justify-center rounded-full bg-fond text-texte-doux">
        <Icone className="size-7" aria-hidden="true" />
      </span>
      <p className="text-lg font-bold text-titre">{titre}</p>
      {description && <p className="max-w-prose text-sm text-texte-doux">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
