import { NavLink } from "react-router";
import { Users, MapPinned, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/ContexteAuth";
import type { CodePermission } from "@/auth/types";
import { LogoCositi } from "@/components/cositi/logo-cositi";

interface EntreeNavigation {
  chemin: string;
  libelle: string;
  icone: typeof Users;
  /**
   * Permission requise pour afficher l'entrée. `undefined` = affichée à tout
   * utilisateur connecté. Le masquage n'est qu'un confort d'affichage :
   * l'API reste seule décisionnaire (`AGENTS.md` règle 1).
   */
  permission?: CodePermission;
}

const ENTREES: readonly EntreeNavigation[] = [
  { chemin: "/adherents", libelle: "Adhérents", icone: Users, permission: "ADHERENT:LIRE" },
  {
    chemin: "/organisation",
    libelle: "Organisation terrain",
    icone: MapPinned,
    // Code confirmé par le catalogue RBAC réel du backend
    // (`COSITI_Backend/src/main/resources/db/migration/V5__catalogue_permissions.sql`),
    // absent de `03_SPECIFICATIONS_API.md §6` qui ne liste aucune permission
    // par endpoint pour ce domaine — voir SUIVI_EXECUTION.md.
    permission: "ORGANISATION:LIRE",
  },
  { chemin: "/cotisations", libelle: "Cotisations", icone: Wallet, permission: "PAIEMENT:LIRE" },
];

/**
 * Navigation latérale, filtrée par les permissions de `GET /auth/moi`. Une
 * entrée sans permission n'est pas affichée grisée : elle n'est pas affichée
 * (`docs/02_DESIGN_SYSTEM.md §8`).
 */
export function NavigationLaterale() {
  const { aLaPermission } = useAuth();
  const entrees = ENTREES.filter((entree) => !entree.permission || aLaPermission(entree.permission));

  return (
    <nav
      aria-label="Navigation principale"
      className="flex h-full w-(--largeur-nav) flex-col gap-1 bg-nav-fond p-4"
    >
      <div className="mb-4 px-2">
        <LogoCositi contexte="nav" className="h-10 w-auto" />
      </div>
      {entrees.map(({ chemin, libelle, icone: Icone }) => (
        <NavLink
          key={chemin}
          to={chemin}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-sm font-medium text-nav-contenu-doux transition-colors",
              isActive && "border-nav-actif-trait bg-nav-actif-fond text-nav-contenu",
            )
          }
        >
          <Icone className="size-5" aria-hidden="true" />
          {libelle}
        </NavLink>
      ))}
    </nav>
  );
}
