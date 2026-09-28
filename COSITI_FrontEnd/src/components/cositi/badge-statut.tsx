import { cn } from "@/lib/utils";
import { definitionStatut, CLASSES_TEINTE, type DomaineStatut } from "@/lib/statuts";

interface BadgeStatutProps {
  domaine: DomaineStatut;
  code: string | null | undefined;
  className?: string;
}

/**
 * Seul composant autorisé à afficher un statut métier
 * (`docs/02_DESIGN_SYSTEM.md §5`). Toujours un libellé, jamais une pastille
 * nue : la couleur n'est jamais le seul indicateur.
 */
export function BadgeStatut({ domaine, code, className }: BadgeStatutProps) {
  const { libelle, teinte, aide } = definitionStatut(domaine, code);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold",
        CLASSES_TEINTE[teinte],
        className,
      )}
      title={aide}
    >
      {libelle}
    </span>
  );
}
