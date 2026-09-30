import { cva, type VariantProps } from "class-variance-authority";
import { initiales } from "@/lib/format";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "flex shrink-0 items-center justify-center rounded-lg font-bold select-none",
  {
    variants: {
      taille: {
        sm: "size-8 rounded-md text-2xs",
        md: "size-10 text-sm",
        lg: "size-12 rounded-xl text-base",
      },
      /** `claire` sur fond clair, `inversee` sur la navigation vert foncé. */
      fond: {
        claire: "bg-primaire-doux text-succes-fort",
        inversee: "bg-nav-actif-fond text-nav-contenu",
      },
    },
    defaultVariants: { taille: "md", fond: "claire" },
  },
);

interface AvatarUtilisateurProps extends VariantProps<typeof avatarVariants> {
  nomComplet: string;
  className?: string;
}

/**
 * Initiales dans un carré arrondi (gabarit : avatar en rayon `lg`). Pas de
 * photo en V1 (non spécifiée). Toujours décoratif : le nom est écrit à côté.
 */
export function AvatarUtilisateur({ nomComplet, taille, fond, className }: AvatarUtilisateurProps) {
  return (
    <span className={cn(avatarVariants({ taille, fond }), className)} aria-hidden="true">
      {initiales(nomComplet)}
    </span>
  );
}
