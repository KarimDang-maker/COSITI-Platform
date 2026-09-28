import { KeyRound, LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/auth/ContexteAuth";
import { AvatarUtilisateur } from "@/components/cositi/avatar-utilisateur";
import { ClocheNotifications } from "@/components/cositi/cloche-notifications";

const LIBELLES_ROLE: Readonly<Record<string, string>> = {
  PCA: "PCA",
  DG: "Directeur général",
  DGA: "Directeur général adjoint",
  DAF: "Directeur administratif et financier",
  GESTIONNAIRE_COMPTE: "Gestionnaire des comptes",
  CHEF_AGENT_TERRAIN: "Chef des agents de terrain",
  AGENT_TERRAIN: "Agent de terrain",
  SUPER_ADMIN: "Super Administrateur",
};

interface EnteteApplicationProps {
  titre: string;
}

/**
 * En-tête de la coquille applicative : titre de l'écran courant et menu
 * utilisateur avec rappel du rôle (`docs/02_DESIGN_SYSTEM.md §8`).
 *
 * Les notifications sont branchées depuis le jalon J8 (`ClocheNotifications`),
 * le domaine `notification` existant désormais côté API. La recherche globale
 * reste non construite : aucun écran de `docs/03_SPECIFICATIONS_ECRANS.md` ne
 * la spécifie (`AGENTS.md` règle 10 — ne pas inventer un écran).
 */
export function EnteteApplication({ titre }: EnteteApplicationProps) {
  const { utilisateur, deconnecter } = useAuth();
  const navigate = useNavigate();

  if (!utilisateur) return null;
  const libelleRole = utilisateur.roles[0] ? (LIBELLES_ROLE[utilisateur.roles[0]] ?? utilisateur.roles[0]) : "";

  return (
    <header className="flex h-(--hauteur-entete) shrink-0 items-center justify-between border-b border-bordure bg-surface px-6">
      {/* Pas un `h1` : le titre sémantique de la page vit dans le contenu de
          l'écran (`docs/02_DESIGN_SYSTEM.md §6` — un seul `h1` par écran). Ce
          libellé n'est qu'un repère de navigation dans l'en-tête. */}
      <p className="text-lg font-semibold text-titre">{titre}</p>

      <div className="flex items-center gap-2">
        <ClocheNotifications />

        <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-anneau">
          <AvatarUtilisateur nomComplet={utilisateur.nomComplet} />
          <span className="text-left text-sm">
            <span className="block font-medium text-texte">{utilisateur.nomComplet}</span>
            <span className="block text-xs text-texte-doux">{libelleRole}</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{utilisateur.identifiant}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate("/mot-de-passe/changer")}>
            <KeyRound className="size-4" aria-hidden="true" />
            Changer mon mot de passe
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              void deconnecter();
            }}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
