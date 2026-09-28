/* COSITI: import de `cn` recâblé sur `@/lib/utils` (le CLI shadcn récent génère un import du paquet publié `cn`, non utilisé ici — voir docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md). */
/* COSITI: gabarit v1.1 — pastille pleine (`rounded-full`), 12 px, graisse 700.
   Support de `BadgeStatut` : ne porte aucune logique de teinte métier. */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-2xs leading-5 font-bold whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-2 focus-visible:ring-anneau [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primaire-survol",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-surface-survol",
        destructive:
          "bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90",
        outline:
          "border-bordure text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
