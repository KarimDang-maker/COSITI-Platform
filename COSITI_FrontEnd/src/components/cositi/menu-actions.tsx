import { useNavigate } from "react-router";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ActionMenu {
  libelle: string;
  icone?: LucideIcon;
  /** Navigation vers un écran existant. */
  chemin?: string;
  onSelect?: () => void;
  /** Action destructive : séparée du reste et en teinte danger. */
  destructive?: boolean;
  desactive?: boolean;
}

interface MenuActionsProps {
  /** Nom accessible du déclencheur — « Actions sur le dossier CNPS », pas « Plus ». */
  libelle: string;
  actions: readonly ActionMenu[];
}

/**
 * Menu « … » d'une carte ou d'une ligne (gabarit : `card-more-btn`). Les
 * actions destructives sont regroupées en fin de menu, derrière un séparateur.
 * Aucune entrée n'est affichée désactivée faute de permission : l'écran ne la
 * passe simplement pas (`docs/02_DESIGN_SYSTEM.md §8`).
 */
export function MenuActions({ libelle, actions }: MenuActionsProps) {
  const navigate = useNavigate();
  if (actions.length === 0) return null;

  const courantes = actions.filter((action) => !action.destructive);
  const destructives = actions.filter((action) => action.destructive);

  function rendre(action: ActionMenu) {
    const Icone = action.icone;
    return (
      <DropdownMenuItem
        key={action.libelle}
        variant={action.destructive ? "destructive" : "default"}
        disabled={action.desactive}
        onSelect={() => {
          if (action.chemin) navigate(action.chemin);
          action.onSelect?.();
        }}
      >
        {Icone && <Icone aria-hidden="true" />}
        {action.libelle}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={libelle}>
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {courantes.map(rendre)}
        {courantes.length > 0 && destructives.length > 0 && <DropdownMenuSeparator />}
        {destructives.map(rendre)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
