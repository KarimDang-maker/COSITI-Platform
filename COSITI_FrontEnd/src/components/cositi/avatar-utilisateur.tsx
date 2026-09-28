import { initiales } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AvatarUtilisateurProps {
  nomComplet: string;
  className?: string;
}

/** Initiales sur fond de marque — pas de photo en V1 (non spécifiée). */
export function AvatarUtilisateur({ nomComplet, className }: AvatarUtilisateurProps) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-primaire-doux text-sm font-semibold text-succes-fort",
        className,
      )}
      aria-hidden="true"
    >
      {initiales(nomComplet)}
    </span>
  );
}
