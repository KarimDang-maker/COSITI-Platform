import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Champ montant (`docs/02 §9.1`) : chasse fixe, aligné à droite, unité
 * « FCFA » accolée (gabarit : `input-group-custom`). L'unité est décorative
 * pour le lecteur d'écran — le libellé du champ la porte déjà : « Montant
 * (FCFA) ».
 */
export function ChampMontant({ className, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  return (
    <div className="relative">
      <Input
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        className={cn("chiffre pr-20 text-right font-mono", className)}
        {...props}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-px right-px flex items-center rounded-r-[calc(var(--rayon-lg)-1px)] border-l border-bordure bg-surface-douce px-3.5 text-sm font-semibold text-texte-doux-fort"
      >
        FCFA
      </span>
    </div>
  );
}
