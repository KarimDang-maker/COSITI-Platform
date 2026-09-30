import { ChevronDown, KeyRound, LogOut, Palette } from "lucide-react";
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
import { libelleRole } from "@/lib/roles";

/**
 * Menu utilisateur de l'en-tête (gabarit : `navbar-profile-btn`) — avatar,
 * nom, rôle écrit en toutes lettres, flèche. Le rôle n'est jamais une couleur
 * (`docs/02 §11`).
 */
export function MenuUtilisateur() {
  const { utilisateur, deconnecter } = useAuth();
  const navigate = useNavigate();
  if (!utilisateur) return null;
  const role = libelleRole(utilisateur.roles[0]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2.5 rounded-lg py-1 pr-2 pl-1 outline-none transition-colors hover:bg-surface-survol focus-visible:ring-2 focus-visible:ring-anneau">
        <AvatarUtilisateur nomComplet={utilisateur.nomComplet} />
        <span className="hidden text-left text-sm md:block">
          <span className="block font-bold text-texte group-hover:text-titre">{utilisateur.nomComplet}</span>
          <span className="block text-xs text-texte-doux-fort">{role}</span>
        </span>
        <ChevronDown
          className="size-4 text-texte-doux transition-transform duration-(--duree-rapide) group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuLabel>Connecté en tant que</DropdownMenuLabel>
        <div className="px-3 pb-2">
          <p className="ref text-sm font-semibold text-texte">{utilisateur.identifiant}</p>
          <p className="text-xs text-texte-doux">{role}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/mot-de-passe/changer")}>
          <KeyRound aria-hidden="true" />
          Changer mon mot de passe
        </DropdownMenuItem>
        {/* Outil de développement : absent du build de production (`app/routes.tsx`). */}
        {import.meta.env.DEV && (
          <DropdownMenuItem onSelect={() => navigate("/design-system")}>
            <Palette aria-hidden="true" />
            Catalogue du design system
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void deconnecter();
          }}
        >
          <LogOut aria-hidden="true" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
