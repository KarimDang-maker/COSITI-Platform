/* COSITI: import de `cn` recâblé sur `@/lib/utils` (le CLI shadcn récent génère un import du paquet publié `cn`, non utilisé ici — voir docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md). */
/* COSITI: gabarit v1.1 — mêmes bordure, rayon, focus et erreur que `input.tsx`. */
import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-lg border border-input bg-surface px-3.5 py-2.5 text-base text-texte shadow-xs transition-[color,border-color,box-shadow] duration-(--duree-rapide) ease-cositi outline-none placeholder:text-texte-doux focus-visible:border-anneau focus-visible:ring-[3px] focus-visible:ring-anneau-halo disabled:cursor-not-allowed disabled:bg-surface-douce disabled:text-texte-doux aria-invalid:border-danger-fort aria-invalid:focus-visible:ring-anneau-danger-halo md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
