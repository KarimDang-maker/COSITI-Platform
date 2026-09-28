/* COSITI: import de `cn` recâblé sur `@/lib/utils` (le CLI shadcn récent génère un import du paquet publié `cn`, non utilisé ici — voir docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md). */
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }
