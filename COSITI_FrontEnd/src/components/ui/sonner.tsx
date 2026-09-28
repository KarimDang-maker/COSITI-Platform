/* COSITI : suppression de la dépendance `next-themes` (aucun mode sombre en
   V1, voir docs/02_DESIGN_SYSTEM.md §2 et §17 « Pas de mode sombre en V1 » —
   ne pas en réintroduire un sans décision explicite consignée dans ce
   document). Thème figé à "light". `--border-radius` mappé sur le jeton de
   rayon de carte COSITI plutôt que sur un `--radius` shadcn inexistant ici. */
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-lg)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
