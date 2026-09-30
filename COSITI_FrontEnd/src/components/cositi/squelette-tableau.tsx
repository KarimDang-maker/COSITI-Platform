import { Skeleton } from "@/components/ui/skeleton";

interface SqueletteTableauProps {
  lignes?: number;
  colonnes?: number;
}

/** Chargement d'un tableau — préféré au spinner plein écran (`docs/02_DESIGN_SYSTEM.md §9.1`). */
export function SqueletteTableau({ lignes = 6, colonnes = 4 }: SqueletteTableauProps) {
  return (
    <div className="space-y-2" role="status" aria-label="Chargement des données">
      {Array.from({ length: lignes }, (_, ligne) => (
        <div key={ligne} className="flex gap-4">
          {Array.from({ length: colonnes }, (_, colonne) => (
            <Skeleton key={colonne} className="h-9 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
