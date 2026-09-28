import { cn } from "@/lib/utils";
import { definitionStatut, CLASSES_TEINTE, type DomaineStatut } from "@/lib/statuts";

interface BadgeStatutProps {
  domaine: DomaineStatut;
  code: string | null | undefined;
  className?: string;
}

/**
 * Seul composant autorisé à afficher un statut métier
 * (`docs/02_DESIGN_SYSTEM.md §5`). Gabarit : pastille arrondie précédée d'un
 * point de la teinte. Le point n'est qu'un repère : le libellé est toujours
 * écrit, la couleur n'est jamais le seul indicateur.
 */
export function BadgeStatut({ domaine, code, className }: BadgeStatutProps) {
  const { libelle, teinte, aide } = definitionStatut(domaine, code);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs leading-5 font-bold whitespace-nowrap",
        CLASSES_TEINTE[teinte],
        // Gabarit (`badge-table`) : pastille sans bordure visible, la surface douce suffit.
        "border-transparent",
        className,
      )}
      title={aide}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {libelle}
    </span>
  );
}
