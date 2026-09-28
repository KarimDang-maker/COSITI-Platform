/* COSITI: import de `cn` recâblé sur `@/lib/utils` (le CLI shadcn récent génère un import du paquet publié `cn`, non utilisé ici — voir docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md). */
/* COSITI: gabarit v1.1 — hauteur 40 px, rayon `lg`, fond blanc, bordure
   `bordure-forte` ; focus = bordure verte + halo ; erreur = bordure danger.
   Désactivé sur `surface-douce`, jamais seulement en opacité réduite. */
import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-input bg-surface px-3.5 py-2 text-base text-texte shadow-xs transition-[color,border-color,box-shadow] duration-(--duree-rapide) ease-cositi outline-none selection:bg-primaire-doux selection:text-titre file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-texte-doux disabled:cursor-not-allowed disabled:bg-surface-douce disabled:text-texte-doux md:text-sm read-only:bg-surface-douce",
        "focus-visible:border-anneau focus-visible:ring-[3px] focus-visible:ring-anneau-halo",
        "aria-invalid:border-danger-fort aria-invalid:focus-visible:ring-anneau-danger-halo",
        className
      )}
      {...props}
    />
  )
}

export { Input }
