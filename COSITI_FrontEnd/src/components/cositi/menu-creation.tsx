import { useNavigate } from "react-router";
import { ClipboardPlus, Plus, UserPlus, WalletCards, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/auth/ContexteAuth";
import type { CodePermission } from "@/auth/types";

interface RaccourciCreation {
  libelle: string;
  chemin: string;
  icone: LucideIcon;
  /** Même permission que la route de destination (`app/routes.tsx`). */
  permission: CodePermission;
}

/**
 * Raccourcis vers les écrans de saisie **existants** uniquement — aucune
 * entrée ne mène à un écran non construit (`AGENTS.md` règle 10).
 */
const RACCOURCIS: readonly RaccourciCreation[] = [
  { libelle: "Nouvel adhérent", chemin: "/adherents/nouveau", icone: UserPlus, permission: "ADHERENT:CREER" },
  { libelle: "Nouveau paiement", chemin: "/cotisations/nouveau", icone: WalletCards, permission: "PAIEMENT:CREER" },
  {
    libelle: "Nouveau compte rendu",
    chemin: "/comptes-rendus/nouveau",
    icone: ClipboardPlus,
    permission: "COMPTE_RENDU:PRODUIRE",
  },
];

/**
 * Menu « Créer » de l'en-tête (gabarit : `btn-quick-action`). Filtré par les
 * permissions de `GET /auth/moi` ; absent si l'utilisateur ne peut rien créer.
 *
 * Ce n'est pas l'action primaire de l'écran (§1 règle 4) : c'est un raccourci
 * de navigation, en vert foncé de navigation, pas en vert d'action.
 */
export function MenuCreation() {
  const { aLaPermission } = useAuth();
  const navigate = useNavigate();
  const raccourcis = RACCOURCIS.filter((raccourci) => aLaPermission(raccourci.permission));
  if (raccourcis.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-titre text-surface shadow-legere hover:bg-primaire">
          <Plus aria-hidden="true" />
          Créer
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Raccourcis de saisie</DropdownMenuLabel>
        {raccourcis.map(({ libelle, chemin, icone: Icone }) => (
          <DropdownMenuItem key={chemin} onSelect={() => navigate(chemin)}>
            <Icone aria-hidden="true" />
            {libelle}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
