import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EtatVideProps {
  titre: string;
  description?: string;
  action?: ReactNode;
}

/** Message explicite + action possible. Jamais un tableau vide sans explication (`docs/02_DESIGN_SYSTEM.md §9.1`). */
export function EtatVide({ titre, description, action }: EtatVideProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-bordure-forte p-8 text-center">
      <Inbox className="size-8 text-texte-doux" aria-hidden="true" />
      <p className="font-semibold text-texte">{titre}</p>
      {description && <p className="max-w-prose text-sm text-texte-doux">{description}</p>}
      {action}
    </div>
  );
}
