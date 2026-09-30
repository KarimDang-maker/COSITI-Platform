/* COSITI: import de `cn` recâblé sur `@/lib/utils` (le CLI shadcn récent génère un import du paquet publié `cn`, non utilisé ici — voir docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md). */
/* COSITI: gabarit v1.1 — hauteurs 32/40/48, rayon `lg` (14 px), graisse 600,
   anneau de focus plein `anneau` décalé de 2 px. Variante `secondary` = bouton clair
   du gabarit (fond de tableau, texte vert foncé). Variante `marque` ajoutée. */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-(--duree-rapide) ease-cositi outline-none focus-visible:ring-2 focus-visible:ring-anneau focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primaire-survol",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-danger-fort/90 focus-visible:ring-danger-fort",
        outline:
          "border-bordure-forte bg-surface text-titre hover:border-primaire hover:bg-surface-douce",
        secondary:
          "border-bordure bg-secondary text-secondary-foreground hover:bg-surface-survol",
        ghost:
          "text-texte-doux-fort hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        /* COSITI: variante de marque — action prioritaire uniquement, jamais un
           état métier (docs/02_DESIGN_SYSTEM.md §4.2/§9.1). Texte sombre
           obligatoire : du blanc sur l'orange de la charte donne 2,46:1 et
           échoue au critère AA. */
        marque: "bg-marque text-marque-contenu hover:bg-marque-survol",
      },
      size: {
        default: "h-10 px-5 has-[>svg]:px-4",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-md px-3.5 text-xs has-[>svg]:px-3",
        lg: "h-12 rounded-xl px-7 text-base has-[>svg]:px-6",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
