import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Bouton carré de l'en-tête applicatif (gabarit : `navbar-action-btn`) —
 * 40 px, fond blanc, bordure `bordure`, ombre légère. Icône seule : le
 * `aria-label` est obligatoire (`docs/02 §9.2`).
 */
export function BoutonEntete({
  className,
  "aria-label": libelle,
  ...props
}: ComponentProps<typeof Button> & { "aria-label": string }) {
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={libelle}
      className={cn(
        "relative border-bordure text-texte shadow-legere hover:border-bordure hover:bg-surface-survol hover:text-titre [&_svg:not([class*='size-'])]:size-5",
        className,
      )}
      {...props}
    />
  );
}
