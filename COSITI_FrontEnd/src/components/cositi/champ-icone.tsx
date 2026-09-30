import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChampIconeProps extends ComponentProps<typeof Input> {
  /** Icône décorative à gauche (gabarit : `login-input-group`, `table-search-box`). */
  icone: LucideIcon;
  /** Classes du conteneur ; `className` s'applique au champ lui-même. */
  classeConteneur?: string;
}

/**
 * Champ précédé d'une icône, dans le champ. L'icône est décorative : le
 * libellé du champ reste obligatoire (`Label` associé ou `aria-label`).
 */
export function ChampIcone({ icone: Icone, classeConteneur, className, ...props }: ChampIconeProps) {
  return (
    <div className={cn("relative", classeConteneur)}>
      <Icone
        className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-texte-doux"
        aria-hidden="true"
      />
      <Input className={cn("pl-11", className)} {...props} />
    </div>
  );
}
